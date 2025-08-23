const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Course, User } = require('../models');

// Initialize Gemini with rate limiting
let genAI = null;
let geminiRateLimited = false;
let lastGeminiAttempt = 0;
const GEMINI_RETRY_AFTER_MS = 5 * 60 * 1000; // 5 minutes

if (process.env.GOOGLE_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  console.log('Gemini API initialized');
} else {
  console.log('Gemini API key not found. Running in fallback mode.');
}

// Test endpoint to verify Gemini connection
router.get('/test', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'Gemini service not initialized. Please set GOOGLE_API_KEY in .env file.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent('Test connection');
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      message: "Gemini connection successful",
      response: text
    });
  } catch (error) {
    console.error('Gemini Test Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing Gemini connection',
      error: error.message
    });
  }
});

// Chatbot endpoint
router.post('/recommendations', auth, express.json(), async (req, res) => {
  // Set a timeout for the entire request
  const timeout = setTimeout(() => {
    return res.status(504).json({
      success: false,
      message: 'Request timed out',
      error: 'The server took too long to respond. Please try again.'
    });
  }, 25000); // 25 second timeout for the entire request

  try {
    const { role = 'student', query } = req.body;
    
    if (!query) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // If Gemini is not initialized, use mock response immediately
    if (!genAI) {
      clearTimeout(timeout);
      return res.json({
        success: true,
        response: `[Mock Response] You asked: "${query}"\n\nI'm currently in mock mode.`,
        recommendations: [],
        suggestedTopics: [],
        source: 'mock-mode'
      });
    }

    const normalizedRole = role.toLowerCase().includes('instructor') || role === 'teacher' 
      ? 'instructor' 
      : 'student';
    
    // Check if we should try Gemini
    const now = Date.now();
    const canUseGemini = genAI && !geminiRateLimited && ((now - lastGeminiAttempt) > GEMINI_RETRY_AFTER_MS);
    
    if (canUseGemini) {
      try {
        lastGeminiAttempt = now;
        geminiRateLimited = false;
        
        // Get user data if available (with timeout)
        let context = '';
        const user = req.user;
        
        // Set a timeout for database operations
        const dbTimeout = setTimeout(() => {
          context = 'User data loading timed out. ';
        }, 3000);
        
        try {
          if (user) {
            if (normalizedRole === 'instructor') {
              const userCourses = await Promise.race([
                Course.countDocuments({ instructor: user._id }),
                new Promise(resolve => setTimeout(() => resolve(0), 2500))
              ]);
              context = `The instructor has created ${userCourses} courses. `;
            } else {
              const enrolledCourses = await Promise.race([
                Course.countDocuments({ students: user._id }),
                new Promise(resolve => setTimeout(() => resolve(0), 2500))
              ]);
              context = `The student is enrolled in ${enrolledCourses} courses. `;
            }
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue with empty context if DB fails
        } finally {
          clearTimeout(dbTimeout);
        }
        
        const systemMessage = normalizedRole === 'instructor'
          ? `${context}You are an expert teaching assistant.`
          : `${context}You are a helpful study assistant.`;
        
        // Set a timeout for the Gemini API call
        const geminiPromise = (async () => {
          const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7,
            },
          });
          
          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{ text: `${systemMessage}\n\nUser asks: ${query}` }]
            }]
          });
          
          return result.response.text();
        })();
        
        // Race between the Gemini API and a timeout
        const geminiResponse = await Promise.race([
          geminiPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
          )
        ]);
        
        clearTimeout(timeout);
        return res.json({
          success: true,
          response: geminiResponse,
          recommendations: [],
          suggestedTopics: [],
          source: 'gemini-ai'
        });
        
      } catch (error) {
        console.error('Gemini API Error:', error);
        if (error.status === 429 || error.message.includes('quota')) {
          geminiRateLimited = true;
          console.log('Gemini rate limited. Will retry after', GEMINI_RETRY_AFTER_MS / 60000, 'minutes');
        }
        // Continue to fallback
      }
    }
    
    // Fallback to mock response
    try {
      const mockResponses = {
        student: {
          'skills in demand': 'Current in-demand skills include: Programming (Python, JavaScript), Data Science, Cloud Computing (AWS, GCP), AI/ML, and DevOps.',
          'default': `Based on current trends, here are some skills you might find valuable: [Skill 1], [Skill 2]. Would you like more specific recommendations?`
        },
        instructor: {
          'skills in demand': 'Instructors should focus on teaching: Python, JavaScript, Cloud Computing, and AI/ML concepts as these are highly sought after.',
          'default': 'As an instructor, consider covering these trending topics: [Topic 1], [Topic 2]. Would you like more specific teaching recommendations?'
        }
      };
      
      const queryLower = query.toLowerCase();
      let response = mockResponses[normalizedRole]?.default || 'I received your message. How can I assist you further?';
      
      // Check for specific queries
      if (queryLower.includes('skill') && queryLower.includes('demand')) {
        response = mockResponses[normalizedRole]?.['skills in demand'] || response;
      }
      
      clearTimeout(timeout);
      return res.json({
        success: true,
        response: response,
        recommendations: [],
        suggestedTopics: [],
        source: 'fallback-response'
      });
      
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      clearTimeout(timeout);
      return res.status(500).json({
        success: false,
        message: 'All fallback methods failed',
        error: fallbackError.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in recommendations endpoint:', error);
    clearTimeout(timeout);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
});

// Get course analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    // Since we removed CourseAnalytics from imports, we'll use Course model directly
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .select('title students price rating instructor createdAt');
    
    const analytics = courses.map(course => ({
      title: course.title,
      studentCount: course.students?.length || 0,
      price: course.price,
      rating: course.rating?.average || 0,
      instructor: course.instructor,
      createdAt: course.createdAt
    }));
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

module.exports = router;

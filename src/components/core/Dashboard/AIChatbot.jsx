import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FaRobot, FaPaperPlane, FaLightbulb, FaBook, FaStar } from 'react-icons/fa';
import { BsArrowRight } from 'react-icons/bs';
import axios from 'axios';
import CourseRecommendation from './CourseRecommendation';
import CourseSuggestion from './CourseSuggestion';
import { aiChatbotEndpoints } from '../../../services/apis';

const AIChatbot = () => {
  const { user } = useSelector((state) => state.profile);
  
  // Log user object to debug account type
  useEffect(() => {
    console.log('Current user object:', user);
    if (user) {
      console.log('User account type:', user.accountType || 'not found');
      console.log('All user properties:', Object.keys(user));
    }
  }, [user]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: user?.accountType === 'instructor' 
        ? 'Hello! I\'m your Course Creation Assistant. How can I help you today?'
        : 'Hi there! I\'m your Study Assistant. What would you like to learn about?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  // Suggested questions based on user role
  useEffect(() => {
    if (user?.accountType === 'instructor') {
      setSuggestedQuestions([
        'What are the latest trends in course creation?',
        'How can I improve my course engagement?',
        'What topics should I create my next course on?',
        'How can I market my courses better?'
      ]);
    } else {
      setSuggestedQuestions([
        'What courses would you recommend for me?',
        'What are the most popular courses right now?',
        'How can I improve my learning?',
        'What skills are in high demand?'
      ]);
    }
  }, [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const testConnection = async () => {
    try {
      const response = await axios.get(aiChatbotEndpoints.GET_AI_RECOMMENDATIONS.replace('/recommendations', '/test'));
      if (response.data.success) {
        toast.success('OpenAI connection successful!');
      } else {
        toast.error('OpenAI connection failed: ' + response.data.error);
      }
    } catch (error) {
      console.error('Connection Test Error:', error);
      toast.error('Failed to test OpenAI connection');
    }
  };

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || isLoading) return;

    try {
      setIsLoading(true);
      
      // Add user message to chat history
      const userMessage = { role: 'user', content: message };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      // Debug user object and determine role
      console.log('User object in sendMessage:', user);
      
      // Get account type from user object (check multiple possible field names)
      const accountType = user?.accountType || user?.role || 'student';
      const userRole = typeof accountType === 'string' 
        ? accountType.toLowerCase().includes('instructor') || accountType.toLowerCase().includes('teacher')
          ? 'instructor' 
          : 'student'
        : 'student';
      
      console.log('Determined user role:', userRole);
      
      // Prepare request data
      const requestData = {
        role: userRole,
        query: message
      };
      
      console.log('Sending request with role:', userRole, 'and query:', message);

      // Log the request
      console.log('Sending AI Chatbot request:', {
        url: aiChatbotEndpoints.GET_AI_RECOMMENDATIONS,
        data: requestData,
        hasToken: !!localStorage.getItem('token')
      });

      // Make the API call with increased timeout and better error handling
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => {
        source.cancel('Request timed out after 30 seconds');
      }, 30000);

      const response = await axios({
        method: 'post',
        url: aiChatbotEndpoints.GET_AI_RECOMMENDATIONS,
        data: requestData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cancelToken: source.token,
        timeout: 30000, // Increased timeout to 30 seconds
        withCredentials: true,
        validateStatus: (status) => status < 500 // Only reject on 5xx errors
      });

      clearTimeout(timeout);

      // Log the response
      console.log('AI Chatbot response:', {
        status: response.status,
        data: response.data
      });

      // Handle the response
      if (response.data?.success) {
        const aiResponse = {
          role: 'assistant',
          content: response.data.response || 'I received your message but had trouble processing it. Could you try rephrasing?',
          recommendations: response.data.recommendations || [],
          suggestedTopics: response.data.suggestedTopics || []
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Handle API error responses (non-2xx status codes)
        const errorMessage = response.data?.message || 'Failed to get a response from the AI service';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          isError: true
        }]);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Chatbot Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        isAxiosError: axios.isAxiosError(error)
      });
      
      // Prepare error message
      let errorMessage = 'Sorry, I encountered an error. Please try again later.';
      
      if (axios.isCancel(error)) {
        errorMessage = 'Request took too long. The server might be busy. Please try again in a moment.';
      } else if (error.response) {
        // Server responded with an error status code (4xx, 5xx)
        errorMessage = error.response.data?.message || 
                      `Server error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timed out. The server took too long to respond.';
      }
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm having trouble connecting to the AI service. ${errorMessage}`,
        isError: true
      }]);
      
      // Show toast for all errors except 401 (unauthorized)
      if (error.response?.status !== 401) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="bg-richblack-900 text-white rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-richblack-700">
        <div className="flex items-center gap-3">
          <div className="bg-richblack-800 p-2 rounded-full">
            <FaRobot className="text-yellow-400 text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-richblack-5">
              {user?.accountType === 'instructor' ? 'Course Creation Assistant' : 'Study Assistant'}
            </h2>
            <p className="text-xs text-richblack-300">
              {isLoading ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'assistant' ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`rounded-lg p-4 max-w-[85%] ${
                message.role === 'assistant'
                  ? 'bg-richblack-800 text-richblack-5'
                  : 'bg-yellow-400 text-richblack-900'
              } ${message.isError ? 'border border-red-500' : ''}`}
            >
              <div className="prose prose-invert max-w-none">
                {message.content.split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Show recommendations if available */}
              {message.recommendations?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-richblack-200 mb-2 flex items-center">
                    <FaBook className="mr-2" /> Recommended Courses
                  </h4>
                  <div className="space-y-2">
                    {message.recommendations.map((course, i) => (
                      <CourseRecommendation key={i} course={course} />
                    ))}
                  </div>
                </div>
              )}

              {/* Show course suggestions for instructors */}
              {message.suggestedTopics?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-richblack-200 mb-2 flex items-center">
                    <FaStar className="mr-2" /> Course Suggestions
                  </h4>
                  <div className="space-y-2">
                    {message.suggestedTopics.map((topic, i) => (
                      <CourseSuggestion key={i} topic={topic} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-4">
          <h3 className="text-sm text-richblack-300 mb-2">Try asking:</h3>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs bg-richblack-800 hover:bg-richblack-700 text-richblack-200 px-3 py-1.5 rounded-full transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-richblack-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={user?.accountType === 'instructor'
              ? 'Ask about course creation recommendations...'
              : 'Ask about course recommendations...'
            }
            className="flex-1 bg-richblack-800 text-richblack-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            disabled={isLoading}
          />
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-richblack-700 text-richblack-200 rounded-lg hover:bg-richblack-600"
            title="Test OpenAI connection"
          >
            <FaLightbulb className="w-5 h-5" />
          </button>
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-yellow-400 text-richblack-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-richblack-300 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FaPaperPlane className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;

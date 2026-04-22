// Importing necessary modules and packages
const express = require("express");
const app = express();
const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const http = require('http');
const server = http.createServer(app);

// Enable CORS for Socket.IO
const io = require('socket.io')(server, { 
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://study-notion-bdf.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

// Import models first to ensure they're registered
require('./models');

// Then import routes
const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const courseRoutes = require("./routes/Course");
const paymentRoutes = require("./routes/Payments");
const contactUsRoute = require("./routes/Contact");
const liveClassRoutes = require('./routes/liveclass');
const quizRoutes = require('./routes/Quiz');

// Setting up port number
const PORT = process.env.PORT || 4000;

// Loading environment variables from .env file
dotenv.config();

// Serve static files from the React app
const path = require('path');
app.use(express.static(path.join(__dirname, '../build')));

// Connecting to database
database.connect();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// File upload middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size limit has been reached (max: 50MB)'
}));
// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://study-notion-bdf.vercel.app'
];

// Enable CORS for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all origins in development or if origin is in allowed list
  if (process.env.NODE_ENV === 'development' || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight');
      return res.status(200).end();
    }
  }
  
  next();
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`\n=== Incoming ${req.method} request ===`);
  console.log('URL:', req.originalUrl);
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Cookies:', req.cookies);
  
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
    if (req.files) {
      console.log('Files:', Object.keys(req.files));
      Object.keys(req.files).forEach(key => {
        console.log(`  ${key}:`, req.files[key].name, `(${req.files[key].size} bytes)`);
      });
    } else {
      console.log('Files: None');
    }
  }
  
  // Log response headers before they're sent
  const originalSend = res.send;
  res.send = function(body) {
    console.log('Response Headers:', this.getHeaders());
    console.log('Response Status:', this.statusCode);
    if (body && typeof body === 'object') {
      console.log('Response Body:', JSON.stringify(body, null, 2));
    } else {
      console.log('Response Body:', body);
    }
    return originalSend.call(this, body);
  };
  
  next();
});

// Connecting to cloudinary
cloudinaryConnect();

// Setting up routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use('/api/v1/course', courseRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/reach', contactUsRoute);
app.use('/api/v1/live-class', liveClassRoutes);
app.use('/api/v1/quiz', quizRoutes);


// Testing the server
app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running ...",
	});
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });

  socket.on('signal', (data) => {
    socket.to(data.roomId).emit('signaling-message', {
      userId: data.userId,
      description: data.description,
      candidate: data.candidate,
    });
  });
});

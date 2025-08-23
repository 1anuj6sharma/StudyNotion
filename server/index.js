// Importing necessary modules and packages
const express = require("express");
const app = express();
const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");

// Load environment variables from .env file
dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Setup socket.io with CORS
const io = require("socket.io")(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow curl / mobile apps
      if (origin.includes("localhost")) return callback(null, true); // dev
      if (origin === "https://study-notion-bdf.vercel.app") return callback(null, true); // main prod
      if (/\.vercel\.app$/.test(origin)) return callback(null, true); // preview deploys
      return callback(new Error("Not allowed by CORS (socket.io)"));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Import models first
require("./models");

// Import routes
const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const courseRoutes = require("./routes/Course");
const paymentRoutes = require("./routes/Payments");
const contactUsRoute = require("./routes/Contact");
const liveClassRoutes = require("./routes/liveclass");

// Setting up port number
const PORT = process.env.PORT || 4000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../build")));

// Connect to database
database.connect();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Fixed dynamic CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow curl / mobile apps
      if (origin.includes("localhost")) return callback(null, true); // dev
      if (origin === "https://study-notion-bdf.vercel.app") return callback(null, true); // main prod
      if (/\.vercel\.app$/.test(origin)) return callback(null, true); // preview deploys
      return callback(new Error("Not allowed by CORS (REST API)"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Connect to cloudinary
cloudinaryConnect();

// Routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);
app.use("/api/v1/live-class", liveClassRoutes);

// AI Chatbot Routes
const aiChatbotRouter = require("./routes/aiChatbot");
app.use("/api/v1/ai-chatbot", aiChatbotRouter);

// Testing the server
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running ...",
  });
});

// "Catchall" handler: for React frontend routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// Start the server
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
  });

  socket.on("signal", (data) => {
    socket.to(data.roomId).emit("signaling-message", {
      userId: data.userId,
      description: data.description,
      candidate: data.candidate,
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

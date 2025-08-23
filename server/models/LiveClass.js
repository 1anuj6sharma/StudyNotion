const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required'],
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required'],
    index: true
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled time is required'],
    validate: {
      validator: function(value) {
        // Ensure scheduled time is in the future
        return value > new Date();
      },
      message: 'Scheduled time must be in the future'
    }
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Minimum duration is 15 minutes'],
    max: [480, 'Maximum duration is 8 hours (480 minutes)'],
    default: 60
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    unique: true,
    index: true
  },
  meetingUrl: {
    type: String,
    required: [true, 'Meeting URL is required'],
    validate: {
      validator: function(v) {
        // Simple URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'live', 'completed', 'cancelled'],
      message: 'Status must be one of: scheduled, live, completed, cancelled'
    },
    default: 'scheduled'
  },
  attendees: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  maxAttendees: {
    type: Number,
    default: 100
  },
  isRecorded: {
    type: Boolean,
    default: false
  },
  recordingUrl: String,
  chatEnabled: {
    type: Boolean,
    default: true
  },
  screenShareEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
liveClassSchema.index({ scheduledAt: 1, status: 1 });
liveClassSchema.index({ instructor: 1 });
liveClassSchema.index({ course: 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);

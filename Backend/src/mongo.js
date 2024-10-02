const { required } = require("datalize/lib/filters");
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/crimeguard", {
  
 
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});

const userSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: true
  },
  lname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

const reportSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  area: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  guilty: {
    type: String,
    required: true
  },
  
  description: {
    type: String
  },
  files: [{
    path: String
  }],
  status: {
    type: String,
    default: 'pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const feedbackSchema = new mongoose.Schema({
  feedback: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});



const User = mongoose.model('User', userSchema);
const Report = mongoose.model('Report', reportSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = { User, Report, Feedback };

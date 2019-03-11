const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
     required: true
  },
  state: {
    type: String,
    required: true
  },
  zipcode: {
    type: String,
    required: true
  },
  courseNo: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  numberOfCourseCredits: {
    type: Number,
    required: false
  },
  presenterName: {
    type: String,
    required: false
  },
  trainingProvider: {
    type: String,
    required: false
  },
  isSubmitted: {
    type: Boolean,
    required: true,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: false,
  }
}, {
  collection: 'events'
});

module.exports = mongoose.model('Events', EventSchema);
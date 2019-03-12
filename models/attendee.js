const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendeeSchema = new Schema({
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false
  },
  signature: {
    type: String,
    required: false
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',
    required: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: false,
  }
}, {
  collection: 'attendees'
});

mongoose.model('Attendees', AttendeeSchema);

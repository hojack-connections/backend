const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
  platform: {
    type: String,
    required: true
  },
  receiptData: {
    type: String,
    required: true
  },
  expirationDate: {
    type: Date,
    required: true
  },
  isTrial: {
    type: Boolean,
    required: true,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
}, {
  collection: 'subscriptions'
});

mongoose.model('Subscriptions', SubscriptionSchema);

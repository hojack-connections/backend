const mongoose = require('mongoose');

const ReceiverSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Events',
      required: true,
    },
  },
  {
    collection: 'receivers',
  }
);

mongoose.model('Receivers', ReceiverSchema);

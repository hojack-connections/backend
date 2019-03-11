const Event = require('../models/event');
const auth = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const AWS = require('aws-sdk');

AWS.config = {
  accessKeyId: process.env.CLIENT_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLIENT_SECRET_ACCESS_KEY,
  region: process.env.CLIENT_AWS_REGION
};

module.exports = app => {
  app.post('/events', auth, asyncHandler(create));
};

/**
 * Create a new Event
 **/
async function create(req, res) {
  const created = await Event.create({
    ...req.body,
    user: req.user.id
  });
  res.json(created);
}

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
  app.put('/events', auth, asyncHandler(update));
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

/**
 * Update an Event document
 **/
async function update(req, res) {
  const _event = await Event.findOne({
    _id: req.body._id
  }).lean().exec();
  if (!_event) {
    res.status(404);
    res.send('Unable to find document to update. Please supply an _id property.');
    return;
  }
  const updated = await Event.updateOne({
    _id: _event._id
  }, {
    ...req.body
  });
  if (updated.nModified !== 1) {
    res.status(400);
    res.send('No documents modified.');
    return;
  }
  res.status(204)
  res.end();
}

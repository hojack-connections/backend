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
  app.delete('/events', auth, asyncHandler(_delete));
};

/**
 * Create a new Event
 **/
async function create(req, res) {
  const created = await Event.create({
    ...req.body,
    user: req.user._id
  });
  res.json(created);
}

/**
 * Update an Event document
 **/
async function update(req, res) {
  const doc = await Event.findOne({
    _id: req.body._id
  }).lean().exec();
  if (!doc) {
    res.status(404);
    res.send('Unable to find document to update. Please supply an _id property.');
    return;
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send('You don\'t own this event and cannot update it.');
    return;
  }
  const updated = await Event.updateOne({
    _id: doc._id
  }, {
    ...req.body
  });
  if (updated.n !== 1) {
    res.status(500);
    res.send('No documents selected.');
    return;
  }
  res.status(204)
  res.end();
}

/**
 * Delete an Event document
 **/
async function _delete(req, res) {
  if (!req.body._id) {
    res.status(400);
    res.send('No _id specified for deletion.');
    return;
  }
  const doc = await Event.findOne({
    _id: req.body._id
  }).lean().exec();
  if (!doc) {
    res.status(404);
    res.send('Unable to find document to delete. Please supply an _id property.');
    return;
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send('You don\'t own this event and cannot delete it.');
    return;
  }
  const deleted = await Event.deleteOne({
    _id: req.body._id,
  }).exec();
  if (deleted.n !== 1) {
    res.status(500);
    res.send('No documents deleted.');
    return;
  }
  res.status(204);
  res.end();
}

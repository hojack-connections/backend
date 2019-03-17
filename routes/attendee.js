const mongoose = require('mongoose');
const Attendee = mongoose.model('Attendees');
const Event = mongoose.model('Events');
const auth = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const AWS = require('aws-sdk');
const uuid = require('uuid');

AWS.config = {
  accessKeyId: process.env.CLIENT_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLIENT_SECRET_ACCESS_KEY,
  region: process.env.CLIENT_AWS_REGION
};

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.CLIENT_BUCKET
  }
});

module.exports = app => {
  app.post('/attendees', auth, asyncHandler(create));
  app.get('/attendees', auth, asyncHandler(loadAttendees));
};

/**
 * Create a new Attendee
 **/
async function create(req, res) {
  if (!req.body.signature) {
    res.status(400);
    res.send('Send a base64 encoded png image of the signature');
    return;
  }
  const buffer = Buffer.from(req.body.signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const imageKey = uuid.v4();
  await s3.putObject({
    Key: imageKey,
    Body: buffer,
    ContentType: 'image/png',
    ContentEncoding: 'base64'
  });
  const created = await Attendee.create({
    ...req.body,
    user: req.user._id,
    signature: imageKey
  });
  res.json(created);
}

/**
 * Load attendees bound to the requesting user
 **/
async function loadAttendees(req, res) {
  const userEvents = await Event.find({
    user: req.user._id
  }).lean().exec();
  const attendees = await Attendee.find({
    event: {
      $in: userEvents.map(e => e._id)
    }
  }).lean().exec();
  res.json(attendees);
}

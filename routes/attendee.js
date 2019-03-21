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
  region: process.env.CLIENT_AWS_REGION,
};

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.CLIENT_BUCKET,
  },
});

module.exports = (app) => {
  app.post('/attendees', auth, asyncHandler(create));
  app.delete('/attendees', auth, asyncHandler(_delete));
  app.put('/attendees', auth, asyncHandler(update));
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
  const buffer = Buffer.from(
    req.body.signature.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );
  const imageKey = uuid.v4();
  await s3.putObject({
    Key: imageKey,
    Body: buffer,
    ContentType: 'image/png',
    ContentEncoding: 'base64',
  });
  const created = await Attendee.create({
    ...req.body,
    user: req.user._id,
    signature: s3.getSignedUrl('getObject', {
      Bucket: process.env.CLIENT_BUCKET,
      Key: imageKey,
    }),
  });
  res.json(created);
}

/**
 * Delete an Attendee document
 **/
async function _delete(req, res) {
  if (!req.body._id) {
    res.status(400);
    res.send('No _id specified for deletion.');
    return;
  }
  const doc = await Attendee.findOne({
    _id: req.body._id,
  })
    .lean()
    .exec();
  if (!doc) {
    res.status(404);
    res.send(
      'Unable to find document to delete. Please supply an _id property.'
    );
    return;
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send("You don't own this event and cannot delete it.");
    return;
  }
  const deleted = await Attendee.deleteOne({
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

async function update(req, res) {
  const doc = await Attendee.findOne({
    _id: req.body._id,
  })
    .lean()
    .exec();
  if (!doc) {
    res.status(404);
    res.send(
      'Unable to find document to update. Please supply an _id property.'
    );
    return;
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send(`You don't own this event and cannot update it.`);
    return;
  }
  const updated = await Attendee.updateOne(
    {
      _id: doc._id,
    },
    {
      ...req.body,
    }
  );
  if (updated.n !== 1) {
    res.status(500);
    res.send('No documents selected.');
    return;
  }
  res.status(204);
  res.end();
}

/**
 * Load attendees bound to the requesting user
 **/
async function loadAttendees(req, res) {
  const userEvents = await Event.find({
    user: req.user._id,
  })
    .lean()
    .exec();
  const attendees = await Attendee.find({
    event: {
      $in: userEvents.map((e) => e._id),
    },
  })
    .lean()
    .exec();
  res.json(attendees);
}

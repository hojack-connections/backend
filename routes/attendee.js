const Attendee = require('../models/attendee');
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
  const buffer = new Buffer(req.body.signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const imageKey = uuid.v4();
  await s3.putObject({
    Key: imageKey,
    Body: buffer,
    ContentType: 'image/png',
    ContentEncoding: 'base64'
  });
  const created = await Attendee.create({
    ...req.body,
    user: req.user.id,
    signature: imageKey
  });
  res.json(created);
}

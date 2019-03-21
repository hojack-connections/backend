const mongoose = require('mongoose');
const Receiver = mongoose.model('Receivers');
const Event = mongoose.model('Events');
const auth = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const emailValidator = require('email-validator');

module.exports = (app) => {
  app.post('/receivers', auth, asyncHandler(create));
  app.delete('/receivers', auth, asyncHandler(_delete));
  app.get('/events/receivers', auth, asyncHandler(loadReceivers));
};

async function create(req, res) {
  if (!emailValidator.validate(req.body.email)) {
    res.status(400);
    res.send('Invalid email supplied.');
    return;
  }
  const _event = await Event.findOne({
    _id: req.body.eventId,
    user: mongoose.Types.ObjectId(req.user._id),
  }).lean().exec();
  if (!_event) {
    res.status(401);
    res.send('Unable to find event or not authorized');
    return;
  }
  const created = await Receiver.create({
    ...req.body,
  });
  res.json(created);
}

async function _delete(req, res) {
  const receiver = await Receiver.findOne({
    _id: req.body._id,
  }).lean().exec();
  if (!receiver) {
    res.status(404);
    res.end();
    return;
  }
  const _event = await Event.findOne({
    _id: mongoose.Types.ObjectId(receiver.eventId),
    user: mongoose.Types.ObjectId(req.user._id),
  }).lean().exec();
  if (!_event) {
    res.status(401);
    res.send('Unable to find associated event, or not authorized');
    return;
  }
  const deleted = await Receiver.deleteOne({
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

async function loadReceivers(req, res) {
  const _event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.query.eventId),
    user: mongoose.Types.ObjectId(req.user._id),
  }).lean().exec();
  if (!_event) {
    res.status(401);
    res.send('Event owned by requesting user does not exist.');
    return;
  }
  const receivers = await Receiver.find({
    eventId: mongoose.Types.ObjectId(req.query.eventId),
  }).lean().exec();
  res.json(receivers);
}

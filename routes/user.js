const User = require('../models/user');
const Event = require('../models/event');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const emailValidator = require('email-validator');
const asyncHandler = require('express-async-handler');

module.exports = app => {
  app.post('/users/login', asyncHandler(login));
  app.get('/users/events', auth, asyncHandler(events));
  app.get('/users', asyncHandler(getUser));
  app.post('/users', asyncHandler(signup));
};

/**
 * Create a new User record and store in database
 **/
async function signup(req, res) {
  if (!emailValidator.validate(req.body.email)) {
    res.status(400);
    res.send('Invalid email supplied.');
    return;
  }
  const emailCount = await User.countDocuments({
    email: {
      $regex: new RegExp(`^${req.body.email}$`, 'i')
    }
  }).exec();
  if (emailCount > 0) {
    res.status(400);
    res.send('This email is already registered. Please try another or login.');
    return;
  }
  if (!req.body.password || req.body.password.length < 5) {
    res.status(400);
    res.send('Please make sure your password is at least 5 character.');
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(req.body.password, salt);
  const created = await User.create({ ...req.body, passwordHash });
  res.json(created);
}

/**
 * Authenticate and generate a jsonwebtoken
 **/
async function login(req, res) {
  const users = await User.find({
    email: req.body.email
  }).exec();
  if (users.length === 0) {
    res.status(400);
    res.send('Email not found.');
    return;
  }
  const isPasswordMatch = await bcrypt.compare(req.body.password, users[0].passwordHash);
  if (!isPasswordMatch) {
    res.status(401);
    res.send('There was a problem authenticating.');
    return;
  }
  const token = jwt.sign({
    ...users[0],
    // Overwrite the password hash and don't send to client
    passwordHash: ''
  }, process.env.WEB_TOKEN_SECRET);
  res.json({ token });
}

/**
 * Retrieve a user by email
 **/
async function getUser(req, res) {
  const users = await User.find({
    email: req.query.email
  }).exec();
  if (users.length === 0) {
    res.status(404);
    res.send('Email not found.');
    return;
  }
  res.json(users[0]);
}

/**
 * Load Event objects owned by authenticated user
 **/
async function events(req, res) {
  const events = await Event.find({
    user: req.user.id
  }).exec();
  res.json(events);
}

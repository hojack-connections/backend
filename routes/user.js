const mongoose = require('mongoose');
const User = require('../models/user');
const connectMiddleware = require('../connectMiddleware');
const bcrypt = require('bcrypt');
const emailValidator = require('email-validator');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json());
app.use(connectMiddleware);

app.get('*', asyncHandler(getUser));
app.post('*', asyncHandler(signup));

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
  const hash = await bcrypt.hash(req.body.password, salt);
  const created = await User.create({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    passwordHash: hash,
    email: req.body.email
  });
  res.json(created);
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

module.exports = app;

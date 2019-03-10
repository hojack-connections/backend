const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const emailValidator = require('email-validator');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json());

app.get('*', asyncHandler(login));
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
  const emailMatches = await User.find({
    email: {
      $regex: new RegExp(`^${req.body.email}$`, 'i')
    }
  });
  if (emailMatches && emailMatches.length > 0) {
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
  const newUser = new User({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    passwordHash: hash,
    email: req.body.email
  });
  const created = await newUser.save();
  res.json(created);
}

/**
 * Authenticate and generate a jsonwebtoken
 **/
async function login(req, res) {
  const users = await User.find({
    email: req.body.email
  });
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
    firstname: users[0].firstname,
    lastname: users[0].lastname,
    email: users[0].email,
    _id: users[0]._id
  }, process.env.WEB_TOKEN_SECRET);
  res.json({ token });
}

module.exports = app;

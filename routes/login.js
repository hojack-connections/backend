const User = require('../models/user');
const mongoConnect = require('../middleware/mongoConnect');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json());
app.use(mongoConnect);

app.post('*', asyncHandler(login));

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
    firstname: users[0].firstname,
    lastname: users[0].lastname,
    email: users[0].email,
    _id: users[0]._id
  }, process.env.WEB_TOKEN_SECRET);
  res.json({ token });
}

module.exports = app;

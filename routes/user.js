const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.get('*', (req, res) => {
  login(req, res);
});

app.post('*', (req, res) => {
  signup(req, res).catch(err => console.log('error', err));
});

module.exports = app;

async function signup(req, res) {
  await checkEmailDuplication(req);
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

exports.login = function(req, res) {
    if(!req.body.email || !req.body.password) {
        return res.status(400).send(config.MISSING_PARAMETER);
    }

    User.find({email: req.body.email}, function(err, users) {
        if (err){
            return res.status(500).send(config.DB_ERROR);
        }
        if (users.length == 0){
            return res.status(401).send(config.AUTHENTICATION_FAILED);
        }

        bcrypt.compare(req.body.password, users[0].passwordHash, function(err, isPasswordMatch) {
            if(isPasswordMatch == false) {
                return res.status(401).send(config.AUTHENTICATION_FAILED);
            }

            var token = jwt.sign({
                firstname: users[0].firstname,
                lastname: users[0].lastname,
                email: users[0].email,
                _id: users[0]._id
            }, config.JWT_SECRET);
            res.json({
                token,
            });
        });

    });
}

function checkEmailDuplication(req) {
  return User.find({
    email: {
      $regex: new RegExp(`^${req.body.email}`, 'i')
    }
  })
    .then(users => {
      if (users && users.length > 0) {
        throw new Error('Email address already exists');
      }
    });
}

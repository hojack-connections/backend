const mongoose = require('mongoose')
const User = mongoose.model('Users')
const Event = mongoose.model('Events')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const emailValidator = require('email-validator')
const asyncHandler = require('express-async-handler')

module.exports = (app) => {
  app.post('/users/login', asyncHandler(login))
  app.get('/users/events', auth, asyncHandler(events))
  app.get('/users', asyncHandler(getUser))
  app.post('/users', asyncHandler(signup))
  app.put('/users', auth, asyncHandler(update))
  app.get('/users/authenticated', auth, asyncHandler(authenticated))
}

/**
 * Create a new User record and store in database
 **/
async function signup(req, res) {
  if (!emailValidator.validate(req.body.email)) {
    res.status(400)
    res.send('Invalid email supplied.')
    return
  }
  const emailCount = await User.countDocuments({
    email: {
      $regex: new RegExp(`^${req.body.email}$`, 'i'),
    },
  }).exec()
  if (emailCount > 0) {
    res.status(400)
    res.send('This email is already registered. Please try another or login.')
    return
  }
  if (!req.body.password || req.body.password.length < 5) {
    res.status(400)
    res.send('Please make sure your password is at least 5 character.')
    return
  }
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(req.body.password, salt)
  const created = await User.create({ ...req.body, passwordHash })
  res.json(created)
}

/**
 * Authenticate and generate a jsonwebtoken
 **/
async function login(req, res) {
  const user = await User.findOne({
    email: req.body.email,
  })
    .lean()
    .exec()
  if (!user) {
    res.status(400)
    res.send('Email not found.')
    return
  }
  const isPasswordMatch = await bcrypt.compare(
    req.body.password,
    user.passwordHash
  )
  if (!isPasswordMatch) {
    res.status(401)
    res.send('There was a problem authenticating.')
    return
  }
  const token = jwt.sign(
    {
      ...user,
      // Overwrite the password hash and don't send to client
      passwordHash: '',
    },
    process.env.WEB_TOKEN_SECRET
  )
  res.json({ token })
}

/**
 * Update a user model
 **/
async function update(req, res) {
  await User.updateOne(
    {
      _id: mongoose.Types.ObjectId(req.user._id),
    },
    req.body
  ).exec()
  res.status(204).end()
}
/**
 * Retrieve a user by email
 **/
async function getUser(req, res) {
  const user = await User.findOne({
    email: req.query.email,
  })
    .lean()
    .exec()
  if (!user) {
    res.status(404)
    res.send('Email not found.')
    return
  }
  delete user.passwordHash
  res.json(user)
}

/**
 * Load Event objects owned by authenticated user
 **/
async function events(req, res) {
  const events = await Event.find({
    user: mongoose.Types.ObjectId(req.user._id),
  })
    .sort({
      date: 1,
    })
    .lean()
    .exec()
  res.json(events)
}

async function authenticated(req, res) {
  const user = await User.findOne({
    _id: mongoose.Types.ObjectId(req.user._id),
  })
    .lean()
    .exec()
  res.json(user)
}

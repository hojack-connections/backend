const mongoose = require('mongoose');
require('./models/attendee');
require('./models/event');
require('./models/user');
require('./models/subscription');
const express = require('express');
const asyncHandler = require('express-async-handler');
const secret = require('./middleware/secret');
const app = express();

app.use(express.json());
app.use(secret);

/**
 * Establish a connection to the mongo database, then continue the request
 **/
app.use(
  asyncHandler(async (req, res, next) => {
    await mongoose.connect(process.env.DB_URI, {
      connectTimeoutMS: 5000,
      useNewUrlParser: true,
    });
    next();
  })
);

require('./routes/attendee')(app);
require('./routes/event')(app);
require('./routes/user')(app);
require('./routes/subscription')(app);

module.exports = app;

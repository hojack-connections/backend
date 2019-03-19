const mongoose = require('mongoose');
require('./models/attendee');
require('./models/event');
require('./models/user');
require('./models/subscription');
const express = require('express');
const bodyParser = require('body-parser');
const asyncHandler = require('express-async-handler');
const app = express();

app.use(bodyParser.json());

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

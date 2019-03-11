const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

app.use(bodyParser.json());

/**
 * Establish a connection to the mongo database, then continue the request
 **/
app.use((req, res, next) => {
  mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true
  })
    .then(() => next())
    .catch(next);
});

require('./attendee')(app);
require('./event')(app);
require('./user')(app);

module.exports = app;

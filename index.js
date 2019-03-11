const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

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

require('./routes/attendee')(app);
require('./routes/event')(app);
require('./routes/user')(app);

module.exports = app;

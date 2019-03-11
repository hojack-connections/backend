const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

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

// Call each other exported function in this directory to allow setup
require('not-index')(__dirname).map(fn => fn(app));

module.exports = app;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoConnect = require('../middleware/mongoConnect');

app.use(bodyParser.json());
app.use(mongoConnect);

// Call each other exported function in this directory to allow setup
require('not-index')(__dirname).map(fn => fn(app));

module.exports = app;

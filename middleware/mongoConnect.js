const mongoose = require('mongoose');

/**
 * Establish a connection to the mongo database, then continue the request
 **/
module.exports = (req, res, next) => {
  mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true
  })
    .then(() => next())
    .catch(next);
};

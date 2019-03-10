const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true
  })
    .then(() => next())
    .catch(next);
};

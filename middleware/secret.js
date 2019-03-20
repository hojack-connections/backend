module.exports = (req, res, next) => {
  if (req.header('APP_SECRET') !== process.env.APP_SECRET) {
    res.status(403);
    res.send('Incorrect pre-shared application secret received.');
    return;
  }
  next();
};

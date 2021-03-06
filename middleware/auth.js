const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const token = req.body.token || req.query.token
  if (!token) {
    res.status(401)
    res.send('No authentication token supplied in body or query.')
    return
  }

  try {
    req.user = jwt.verify(token, process.env.WEB_TOKEN_SECRET)
    next()
  } catch (err) {
    console.log('Error decoding token', err)
    res.status(500)
    res.send(err.toString())
  }
}

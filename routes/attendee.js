const mongoose = require('mongoose')
const Attendee = mongoose.model('Attendees')
const Event = mongoose.model('Events')
const auth = require('../middleware/auth')
const asyncHandler = require('express-async-handler')
const AWS = require('aws-sdk')
const uuid = require('uuid')
const PDFDocument = require('pdfkit')
const moment = require('moment')

AWS.config = {
  accessKeyId: process.env.CLIENT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLIENT_AWS_SECRET_ACCESS_KEY,
  region: process.env.CLIENT_AWS_REGION,
}

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.CLIENT_BUCKET,
  },
})

module.exports = (app) => {
  app.post('/attendees', auth, asyncHandler(create))
  app.delete('/attendees', auth, asyncHandler(_delete))
  app.put('/attendees', auth, asyncHandler(update))
  app.get('/attendees', auth, asyncHandler(loadAttendees))
  app.get('/attendees/certificate', asyncHandler(downloadCertificate))
}

const generateCertificate = (_event, attendee) => {
  const doc = new PDFDocument()
  // Defined here: https://github.com/foliojs/pdfkit/blob/b13423bf0a391ed1c33a2e277bc06c00cabd6bf9/lib/page.coffee#L72-L122
  const LETTER_WIDTH = 612
  const imageWidth = 500
  doc.image('assets/certificateHeader.jpg', {
    x: LETTER_WIDTH / 2 - imageWidth / 2,
    width: imageWidth,
    align: 'center',
  })
  doc.moveDown(2)
  doc.font('Times-Roman')
  doc.fontSize(20).text('CERTIFICATE OF COURSE COMPLETION', {
    align: 'center',
  })
  // Draw multiple sections of text in a centered fashion
  const centered = (...textOptions) => {
    // Keep track of the original document X position
    const originalX = doc.x
    const textMeasurements = []
    let totalWidth = 0
    for (let x = 0; x < textOptions.length; x += 1) {
      const { text, options } = textOptions[x]
      const width = doc.widthOfString(text, options)
      textMeasurements.push(width)
      totalWidth += width
    }
    let currentX = LETTER_WIDTH / 2 - totalWidth / 2
    for (let x = 0; x < textOptions.length; x += 1) {
      const { text, options } = textOptions[x]
      doc.text(text, currentX, doc.y, options)
      if (x >= textOptions.length - 1) continue
      doc.moveUp()
      currentX += textMeasurements[x]
    }
    // Reset the document X position
    doc.text('', originalX, doc.y)
  }
  doc.fontSize(15)
  centered(
    { text: 'This certifies that ' },
    {
      text: `${attendee.firstname} ${attendee.lastname}`,
      options: { underline: true },
    },
    { text: ' has completed ' }
  )
  doc.moveDown()
  doc.fontSize(20).text(_event.name, {
    align: 'center',
  })
  if (_event.presenterName) {
    doc.moveDown()
    doc.fontSize(13)
    centered({ text: 'Presented by: ' }, { text: _event.presenterName })
  }
  if (_event.trainingProvider) {
    doc.moveDown()
    doc.fontSize(13).text(`Training provider: ${_event.trainingProvider}`, {
      align: 'center',
    })
  }
  if (_event.numberOfCourseCredits) {
    const hours = _event.numberOfCourseCredits
    doc.moveDown()
    doc
      .fontSize(13)
      .text(`${hours} Professional Development Hour${hours === 1 ? '' : 's'}`, {
        align: 'center',
      })
  }
  doc.moveDown()
  doc
    .fontSize(13)
    .font('Times-Bold')
    .text(
      'Professional Engineering, Land Surveying, Architecture, Landscape Architecture'
    )
    .font('Times-Roman')
  doc.moveDown()
  centered(
    {
      text: 'Date & Location: ',
    },
    {
      text: `${moment(_event.date).format('M/D/YYYY')} at ${_event.address}`,
      options: {
        underline: true,
      },
    }
  )
  doc.fontSize(13).text()
  doc.end()
  return doc
}

module.exports.generateCertificate = generateCertificate

async function downloadCertificate(req, res) {
  const { eventId, attendeeId } = req.query
  if (!eventId || !attendeeId) {
    res.status(400).json({
      message: 'No eventId or attendeeId supplied in query params',
    })
    return
  }
  const [_event, attendee] = await Promise.all([
    Event.findOne({
      _id: mongoose.Types.ObjectId(eventId),
    })
      .lean()
      .exec(),
    Attendee.findOne({
      _id: mongoose.Types.ObjectId(attendeeId),
    })
      .lean()
      .exec(),
  ])
  if (!_event) {
    res.status(404).json({
      message: 'Unable to find supplied eventId',
    })
    return
  }
  if (!attendee) {
    res.status(404).json({
      message: 'Unable to find supplied attendeeId',
    })
    return
  }
  res.setHeader('Content-Type', 'application/pdf')
  // res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf')
  generateCertificate(_event, attendee).pipe(res)
}

/**
 * Create a new Attendee
 **/
async function create(req, res) {
  if (!req.body.signature) {
    res.status(400)
    res.send('Send a base64 encoded png image of the signature')
    return
  }
  const buffer = Buffer.from(
    req.body.signature.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  )
  const imageKey = uuid.v4()
  await s3
    .putObject({
      Key: imageKey,
      Body: buffer,
      ContentType: 'image/png',
      ContentEncoding: 'base64',
    })
    .promise()
  const created = await Attendee.create({
    ...req.body,
    user: req.user._id,
    signature: `https://${process.env.CLIENT_BUCKET}.s3.${
      process.env.CLIENT_AWS_REGION
    }.amazonaws.com/${imageKey}`,
  })
  res.json(created)
}

/**
 * Delete an Attendee document
 **/
async function _delete(req, res) {
  if (!req.body._id) {
    res.status(400)
    res.send('No _id specified for deletion.')
    return
  }
  const doc = await Attendee.findOne({
    _id: req.body._id,
  })
    .lean()
    .exec()
  if (!doc) {
    res.status(404)
    res.send(
      'Unable to find document to delete. Please supply an _id property.'
    )
    return
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401)
    res.send("You don't own this event and cannot delete it.")
    return
  }
  const deleted = await Attendee.deleteOne({
    _id: req.body._id,
  }).exec()
  if (deleted.n !== 1) {
    res.status(500)
    res.send('No documents deleted.')
    return
  }
  res.status(204)
  res.end()
}

async function update(req, res) {
  const doc = await Attendee.findOne({
    _id: req.body._id,
  })
    .lean()
    .exec()
  if (!doc) {
    res.status(404)
    res.send(
      'Unable to find document to update. Please supply an _id property.'
    )
    return
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401)
    res.send(`You don't own this event and cannot update it.`)
    return
  }
  const updated = await Attendee.updateOne(
    {
      _id: doc._id,
    },
    {
      ...req.body,
    }
  )
  if (updated.n !== 1) {
    res.status(500)
    res.send('No documents selected.')
    return
  }
  res.status(204)
  res.end()
}

/**
 * Load attendees bound to the requesting user
 **/
async function loadAttendees(req, res) {
  const userEvents = await Event.find({
    user: req.user._id,
  })
    .lean()
    .exec()
  const attendees = await Attendee.find({
    event: {
      $in: userEvents.map((e) => e._id),
    },
  })
    .sort({
      firstname: 1,
    })
    .lean()
    .exec()
  res.json(attendees)
}

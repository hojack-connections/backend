const mongoose = require('mongoose');
const Event = mongoose.model('Events');
const Attendee = mongoose.model('Attendees');
const auth = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const AWS = require('aws-sdk');
const emailValidator = require('email-validator');
const mandrill = require('mandrill-api/mandrill');
const mandrillClient = new mandrill.Mandrill(process.env.MANDRILL_API_KEY);

AWS.config = {
  accessKeyId: process.env.CLIENT_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLIENT_SECRET_ACCESS_KEY,
  region: process.env.CLIENT_AWS_REGION,
};

module.exports = (app) => {
  app.post('/events', auth, asyncHandler(create));
  app.put('/events', auth, asyncHandler(update));
  app.delete('/events', auth, asyncHandler(_delete));
  app.post('/events/submit', auth, asyncHandler(submit));
  app.get('/users/events/count', auth, asyncHandler(getEventCount));
  app.get('/events/attendees', auth, asyncHandler(getAttendees));
};

/**
 * Get the number of events owned by a user
 **/
async function getEventCount(req, res) {
  const count = await Event.countDocuments({
    user: req.user._id,
  }).exec();
  res.json({ count });
}

/**
 * Create a new Event
 **/
async function create(req, res) {
  const created = await Event.create({
    ...req.body,
    user: req.user._id,
  });
  res.json(created);
}

/**
 * Update an Event document
 **/
async function update(req, res) {
  const doc = await Event.findOne({
    _id: req.body._id,
  })
    .lean()
    .exec();
  if (!doc) {
    res.status(404);
    res.send(
      'Unable to find document to update. Please supply an _id property.'
    );
    return;
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send("You don't own this event and cannot update it.");
    return;
  }
  const updated = await Event.updateOne(
    {
      _id: doc._id,
    },
    {
      ...req.body,
    }
  );
  if (updated.n !== 1) {
    res.status(500);
    res.send('No documents selected.');
    return;
  }
  res.status(204);
  res.end();
}

/**
 * Delete an Event document
 **/
async function _delete(req, res) {
  if (!req.body._id) {
    res.status(400);
    res.send('No _id specified for deletion.');
    return;
  }
  const doc = await Event.findOne({
    _id: req.body._id,
  })
    .lean()
    .exec();
  if (!doc) {
    res.status(404);
    res.send(
      'Unable to find document to delete. Please supply an _id property.'
    );
    return;
  }
  if (doc.user.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send("You don't own this event and cannot delete it.");
    return;
  }
  const deleted = await Event.deleteOne({
    _id: req.body._id,
  }).exec();
  if (deleted.n !== 1) {
    res.status(500);
    res.send('No documents deleted.');
    return;
  }
  res.status(204);
  res.end();
}

async function getAttendees(req, res) {
  if (!req.query.eventId) {
    res.status(400);
    res.send('Please supply an eventId to retrieve attendees for.');
    return;
  }
  const attendees = await Attendee.find({
    event: req.query.eventId,
  })
    .lean()
    .exec();
  res.json(attendees);
}

/**
 * Submit and send emails
 **/
/* eslint-disable camelcase */
async function submit(req, res) {
  const doc = await Event.findOne({
    _id: req.body._id,
  })
    .populate('user')
    .exec();
  if (!doc) {
    res.status(404);
    res.send(
      'Unable to find document to submit. Please supply an _id property.'
    );
    return;
  }
  if (doc.user._id.toString() !== req.user._id.toString()) {
    res.status(401);
    res.send("You don't own this event and cannot submit it.");
    return;
  }
  const certReceivers = (req.body.certReceivers || []).filter((email) =>
    emailValidator.validate(email)
  );

  const sheetReceivers = (req.body.sheetReceivers || []).filter((email) =>
    emailValidator.validate(email)
  );

  const attendees = await Attendee.find({
    event: req.body._id,
  })
    .lean()
    .exec();
  if (req.body.sheetReceivers.indexOf('all') !== -1) {
    sheetReceivers.push(...attendees.map((a) => a.email));
  }
  if (req.body.certReceivers.indexOf('all') !== -1) {
    certReceivers.push(...attendees.map((a) => a.email));
  }
  const sheetTemplateData = {
    key: process.env.MANDRILL_API_KEY,
    template_content: [],
    message: {
      auto_text: true,
      inline_css: true,
      merge: true,
      merge_language: 'handlebars',
      to: sheetReceivers.map((email) => ({
        email,
      })),
      subject: 'ATTENDANCE SUMMARY',
      global_merge_vars: [
        {
          name: 'courseNo',
          content: doc.courseNo,
        },
        {
          name: 'courseName',
          content: doc.courseName,
        },
        {
          name: 'address',
          content: doc.address,
        },
        {
          name: 'city',
          content: doc.city,
        },
        {
          name: 'state',
          content: doc.state,
        },
        {
          name: 'presenterName',
          content: doc.presenterName,
        },
        {
          name: 'attendees',
          content: attendees,
        },
      ],
      from_email: 'support@hojackconnections.com',
    },
    template_name: 'TEST_SUMMARY_SHEET_EMAIL',
  };
  await new Promise((rs, rj) => {
    mandrillClient.messages.sendTemplate(sheetTemplateData, (results) => {
      if (results.filter((r) => r.status !== 'sent').length) rj(results);
      else rs();
    });
  });
  const date = new Date(doc.date);
  await Promise.all(
    attendees.map((attendee) => {
      const certTemplateData = {
        key: process.env.MANDRILL_API_KEY,
        template_content: [],
        message: {
          auto_text: true,
          inline_css: true,
          merge: true,
          merge_language: 'mailchimp',
          to: certReceivers.map((email) => ({
            email,
          })),
          global_merge_vars: [
            {
              name: 'FNAME',
              content: attendee.firstname,
            },
            {
              name: 'LNAME',
              content: attendee.lastname,
            },
            {
              name: 'COURSET',
              content: doc.courseName,
            },
            {
              name: 'Presenter',
              content: doc.presenterName,
            },
            {
              name: 'ADDRESS',
              content: doc.address,
            },
            {
              name: 'TRAININGP',
              content: doc.trainingProvider,
            },
            {
              name: 'TDATE',
              content:
                date.getMonth() +
                1 +
                '/' +
                date.getDate() +
                '/' +
                date.getFullYear(),
            },
            {
              name: 'CREDITS',
              content: doc.numberOfCourseCredits,
            },
          ],
          subject: 'CERTIFICATE OF COURSE COMPLETION',
          from_email: 'support@hojackconnections.com',
        },
        template_name: 'Certificate Template',
      };
      return new Promise((rs, rj) => {
        mandrillClient.messages.sendTemplate(certTemplateData, (results) => {
          if (results.filter((r) => r.status !== 'sent').length) rj(results);
          else rs();
        });
      });
    })
  );
  await Event.updateOne(
    {
      _id: doc._id,
    },
    {
      isSubmitted: true,
    }
  );
  res.status(204);
  res.end();
}
/* eslint-enable camelcase */

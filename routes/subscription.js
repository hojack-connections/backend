const mongoose = require('mongoose');
const Subscription = mongoose.model('Subscriptions');
const auth = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const axios = require('axios');

const IOS_VERIFICATION_LIVE = 'https://buy.itunes.apple.com/verifyReceipt';
const IOS_VERIFICATION_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

module.exports = app => {
  app.get('/subscriptions/status', auth, asyncHandler(status));
  app.post('/subscriptions', auth, asyncHandler(create));
};

/**
 * Create a new subscription entry after verifying the supplied receipt
 **/
async function create(req, res) {
  if (req.body.isTrial) {
    const trialSubscription = await Subscription.findOne({
      userId: req.user._id,
      isTrial: true
    }).lean().exec();
    if (trialSubscription) {
      res.status(400);
      res.send('Unable to create a second trial period.');
      return;
    }
    const trialLengthMS = 1000 * 60 * 60 * 24 * 14;
    req.body.expirationDate = new Date(Date.now() + trialLengthMS);
  } else if (req.body.platform === 'ios') {
    const verificationRes = await axios.post(IOS_VERIFICATION_SANDBOX, {
      'receipt-data': req.body.receiptData
    });
    console.log(verificationRes);
    res.send('done');
  } else if (req.body.platform === 'android') {
    res.status(400);
    res.send('android receipt verification is not yet supported');
    return;
  } else {
    res.status(400);
    res.send(`Invalid platform specified: ${req.body.platform}`);
    return;
  }
  // Validate receipt
  const created = await Subscription.create({
    ...req.body,
    userId: req.user._id
  });
  res.json(created);
}

/**
 * Return the subscription status, active subscription, trial subscription and
 * whether the requesting user is eligible for a free trial
 **/
async function status(req, res) {
  const [ activeSubscription, trialSubscription ] = await Promise.all([
    Subscription.findOne({
      userId: req.user._id,
      expirationDate: {
        $gte: new Date()
      }
    }).lean().exec(),
    Subscription.findOne({
      userId: req.user._id,
      isTrial: true
    })
  ]);
  res.json({
    activeSubscription,
    trialSubscription,
    freeTrialEligible: !trialSubscription
  });
}

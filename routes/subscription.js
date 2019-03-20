const mongoose = require('mongoose');
const Subscription = mongoose.model('Subscriptions');
const auth = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const axios = require('axios');

const IOS_VERIFICATION_LIVE = 'https://buy.itunes.apple.com/verifyReceipt';
const IOS_VERIFICATION_SANDBOX =
  'https://sandbox.itunes.apple.com/verifyReceipt';

const productIdMap = {
  onemonth: 1000 * 60 * 60 * 24 * 31,
  threemonth: 1000 * 60 * 60 * 24 * 31 * 3,
  sixmonth: 1000 * 60 * 60 * 24 * 31 * 6,
  twelvemonth: 1000 * 60 * 60 * 24 * 31 * 12,
};

module.exports = (app) => {
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
      isTrial: true,
    })
      .lean()
      .exec();
    if (trialSubscription) {
      res.status(400);
      res.send('Unable to create a second trial period.');
      return;
    }
    const trialLengthMS = 1000 * 60 * 60 * 24 * 14;
    await Subscription.create({
      ...req.body,
      userId: req.user._id,
      expirationDate: new Date(Date.now() + trialLengthMS),
    });
    await status(req, res);
  } else if (req.body.platform === 'ios') {
    const verificationRes = await axios.post(IOS_VERIFICATION_SANDBOX, {
      'receipt-data': req.body.receiptData,
    });
    // receipt.in_app contains an array of purchases
    if (verificationRes.data.status !== 0) {
      res.status(400);
      res.send('Error validating iOS purchase receipt');
      return;
    }
    // Apple sends all the receipts on device
    // Make sure to process all of them and add them
    // The one furthest in the future will automatically be the active one
    const { receipt } = verificationRes.data;
    await Promise.all(receipt.in_app.map(purchase => {
      return Subscription.findOne({
        userId: req.user._id,
        transactionId: purchase.transaction_id,
      })
        .then((doc) => {
          if (doc) return;
          return Subscription.create({
            ...req.body,
            userId: req.user._id,
            expirationDate: new Date(+purchase.purchase_date_ms + productIdMap[purchase.product_id]),
            transactionId: purchase.transaction_id,
          });
        });
    }));
    await status(req, res);
  } else if (req.body.platform === 'android') {
    res.status(400);
    res.send('android receipt verification is not yet supported');
  } else {
    res.status(400);
    res.send(`Invalid platform specified: ${req.body.platform}`);
  }
}

/**
 * Return the subscription status, active subscription, trial subscription and
 * whether the requesting user is eligible for a free trial
 **/
async function status(req, res) {
  const [activeSubscription, trialSubscription, latestSubscription] = await Promise.all([
    Subscription.findOne({
      userId: req.user._id,
      expirationDate: {
        $gte: new Date(),
      },
    }, null, {
      sort: {
        expirationDate: -1
      }
    }).lean().exec(),
    Subscription.findOne({
      userId: req.user._id,
      isTrial: true,
    }).lean().exec(),
    Subscription.findOne({
      userId: req.user._id,
      isTrial: false,
    }, null, {
      sort: {
        expirationDate: -1
      }
    }).lean().exec(),
  ]);
  res.json({
    activeSubscription,
    trialSubscription,
    latestSubscription,
    freeTrialEligible: !trialSubscription,
  });
}

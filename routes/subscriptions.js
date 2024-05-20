const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Subscription = require('../models/subscriptionModel'); // Adjust the path as necessary

// CREATE a new subscription
router.post('/', async (req, res) => {
  try {
    const { type, sponsor, tag } = req.body;

    const newSubscription = new Subscription({
      type,
      sponsor: sponsor ? { _id: mongoose.Types.ObjectId.createFromHexString(sponsor._id), name: sponsor.name } : null,
      tag: tag ? { _id: mongoose.Types.ObjectId.createFromHexString(tag._id), name: tag.name } : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newSubscription.save();

    res.status(201).json({
      status: 'success',
      data: {
        subscription: newSubscription
      }
    });
  } catch (error) {
    console.error("Error creating subscription", error);
    res.status(500).send("Error creating subscription");
  }
});

// READ all subscriptions
router.get('/', async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.status(200).json({
      status: 'success',
      data: subscriptions
    });
  } catch (error) {
    console.error("Error fetching subscriptions", error);
    res.status(500).send("Error fetching subscriptions");
  }
});

// READ a specific subscription by ID
router.get('/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    console.error("Error fetching subscription", error);
    res.status(500).send("Error fetching subscription");
  }
});

// UPDATE a specific subscription by ID
router.patch('/:id', async (req, res) => {
  try {
    const { type, sponsor, tag } = req.body;

    const updateData = {
      type,
      sponsor: sponsor ? { _id: mongoose.Types.ObjectId(sponsor._id), name: sponsor.name } : null,
      tag: tag ? { _id: mongoose.Types.ObjectId(tag._id), name: tag.name } : null,
      updatedAt: new Date()
    };

    const subscription = await Subscription.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!subscription) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    console.error("Error updating subscription", error);
    res.status(500).send("Error updating subscription");
  }
});

// DELETE (soft delete) a specific subscription by ID
router.delete('/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(req.params.id, { status: 0 }, { new: true });

    if (!subscription) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    console.error("Error deleting subscription", error);
    res.status(500).send("Error deleting subscription");
  }
});

module.exports = router;

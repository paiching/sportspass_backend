// routes/notifications.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/notificationsModel');

// Helper function to validate ObjectId
const isValidObjectId = id => mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);

// CREATE a new notification
router.post('/', async (req, res) => {
  try {
    const { title, url, userInfo, status } = req.body;

    // Validate and convert userInfo.userId to ObjectId
    const updatedUserInfo = userInfo.map(user => {
      if (!isValidObjectId(user.userId)) {
        throw new Error(`Invalid userId: ${user.userId}`);
      }
      return {
        ...user,
        userId: mongoose.Types.ObjectId.createFromHexString(user.userId)
      };
    });

    const newNotification = new Notification({
      title,
      url,
      userInfo: updatedUserInfo,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newNotification.save();

    res.status(201).json({
      status: 'success',
      data: {
        notification: newNotification
      }
    });
  } catch (error) {
    console.error("Error creating notification:", error.message);
    res.status(500).send(`Error creating notification: ${error.message}`);
  }
});

// READ all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.status(200).json({
      status: 'success',
      data: {
        notifications
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    res.status(500).send(`Error fetching notifications: ${error.message}`);
  }
});

// GET notifications containing a specific userId
router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Ensure userId is an ObjectId
      const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId);
  
      const notifications = await Notification.find({ 'userInfo.userId': userObjectId });
  
      // Filter userInfo to include only the relevant userId's information
      const filteredNotifications = notifications.map(notification => {
        const filteredUserInfo = notification.userInfo.filter(user => user.userId.equals(userObjectId));
        return {
          ...notification.toObject(),
          userInfo: filteredUserInfo
        };
      });
  
      res.status(200).json({
        status: 'success',
        data: {
          notifications: filteredNotifications
        }
      });
    } catch (error) {
      console.error("Error fetching notifications", error);
      res.status(500).send("Error fetching notifications");
    }
  });

// READ a specific notification by ID
router.get('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error("Error fetching notification:", error.message);
    res.status(500).send(`Error fetching notification: ${error.message}`);
  }
});

// UPDATE a specific notification by ID
router.patch('/:id', async (req, res) => {
  try {
    const { title, url, userInfo, status } = req.body;

    // Validate and convert userInfo.userId to ObjectId
    const updatedUserInfo = userInfo.map(user => {
      if (!isValidObjectId(user.userId)) {
        throw new Error(`Invalid userId: ${user.userId}`);
      }
      return {
        ...user,
        userId: mongoose.Types.ObjectId.createFromHexString(user.userId)
      };
    });

    const updateData = {
      title,
      url,
      userInfo: updatedUserInfo,
      status,
      updatedAt: new Date()
    };

    const notification = await Notification.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error("Error updating notification:", error.message);
    res.status(500).send(`Error updating notification: ${error.message}`);
  }
});

// DELETE (soft delete) a specific notification by ID
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { status: 0 }, { new: true });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    res.status(500).send(`Error deleting notification: ${error.message}`);
  }
});

module.exports = router;

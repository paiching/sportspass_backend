const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const router = express.Router();
const mongoose = require('mongoose');
const User = require("../models/usersModel"); 
const Subscription = require('../models/subscriptionModel');
const AppError = require('../appError');
const verifyToken = require('../middlewares/verifyToken');  

/* JWT */
const generateSendJWT = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_DAY
  });

  user.password = undefined; // Hide the password field

  res.status(statusCode).json({
      status: 'success',
      token,
      data: {
          user
      }
  });
};

/* GET users listing. */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 })
    .populate({
      path: 'subscribes',
      model: Subscription 
    }); 
    
    res.status(200).json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (error) {
    console.error("Database query failed", error);
    res.status(500).send("Error accessing the database");
  }
});

router.get('/profile/:id', verifyToken, async (req, res, next) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId, '-password')
      .populate({
        path: 'subscribes',
        model: Subscription // or 'Subscription' if you prefer
      });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error("Error in get user profile route:", error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
});

router.post('/register', async (req, res, next) => {
  const { account, password, email, phone, role } = req.body;

  try {
    // Check if the account or email already exists
    const userExists = await User.findOne({
      $or: [
          { account },
          { email }
      ]
    });

    if (userExists) {
      const errorMessage = userExists.account === account ? 'Account already exists' : 'Email already exists';
      return res.status(400).json({ error: errorMessage });
    }

    // Hash password
    if (!password) throw new Error('Password is required');  // Check if password is not undefined
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      account,
      email,
      password: hashedPassword,
      phone,
      role,
      active: true,
      createdAt: new Date(),  // Manually set the creation date
      updatedAt: new Date()   // Manually set the update date
    });

    await newUser.save();
    generateSendJWT(newUser, 201, res);
  } catch (error) {
    console.error("Error in sign-up route:", error);
    next(error);  // Ensure `next` is properly defined or use res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return next(new AppError(400, 'Please provide email and password'));
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError(401, 'Incorrect email or password'));
    }

    generateSendJWT(user, 200, res);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', verifyToken, async (req, res, next) => {
  const userId = req.params.id;
  const updates = req.body;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Perform updates, including password hashing if necessary
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // Update the user document
    Object.assign(user, updates, { updatedAt: new Date() });
    await user.save();

    // Exclude the password field from the response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error("Error in update user route:", error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
});

router.delete('/:id', verifyToken, async (req, res, next) => {
  const userId = req.params.id;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Soft delete the user by marking as inactive
    user.active = false;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {}
    }); // Successfully soft deleted, return success status and empty data
  } catch (error) {
    console.error("Error in delete user route:", error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
});

module.exports = router;

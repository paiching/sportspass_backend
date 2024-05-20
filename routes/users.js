const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const router = express.Router();
const mongoose = require('mongoose');
const User = require("../models/usersModel"); 
const Event = require('../models/eventsModel');
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
    })
    .populate({
      path: 'focusedEvents',
      model: Event 
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
      })
      .populate({
        path: 'focusedEvents',
        model: Event 
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
      $or: [{ account }, { email }]
    });

    if (userExists) {
      const errorMessage = userExists.account === account ? 'Account already exists' : 'Email already exists';
      return res.status(400).json({ error: errorMessage });
    }

    // Validate that the password is provided
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Hash password
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
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();
    generateSendJWT(newUser, 201, res);
  } catch (error) {
    console.error("Error in sign-up route:", error);
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, account, password } = req.body;

  if (!email && !account) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide email or account and password'
    });
  }

  if (!password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide password'
    });
  }

  try {
    // Find the user by email or account, ensuring to include the password field
    const user = await User.findOne({ $or: [{ email }, { account }] }).select('+password');

    if (!user) {
      console.error('User not found:', email || account);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email/account or password'
      });
    }

    if (!user.password) {
      console.error('Password is undefined for user:', user);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email/account or password'
      });
    }

    console.log('Comparing passwords for user:', user._id);
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.error('Password mismatch for user:', user._id);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email/account or password'
      });
    }

    generateSendJWT(user, 200, res);
  } catch (error) {
    console.error('Error during login process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
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

// PATCH update user subscriptions
router.patch('/subscription/:id', verifyToken, async (req, res, next) => {
  const userId = req.params.id;
  const { subscribes } = req.body;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update the subscribes field
    if (subscribes) {
      user.subscribes = subscribes.map(id => mongoose.Types.ObjectId.createFromHexString(id));
    }

    user.updatedAt = new Date();
    await user.save();

    // Populate the subscribes field
    const populatedUser = await User.findById(userId).populate({
      path: 'subscribes',
      model: Subscription 
    });

    // Exclude the password field from the response
    populatedUser.password = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        user: populatedUser
      }
    });
  } catch (error) {
    console.error("Error in update user subscriptions route:", error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
});

// Route to empty the subscribes field for a specific user
router.delete('/subscription/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;
  const { subscribes } = req.body;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update the subscribes field
    if (subscribes) {
      user.subscribes = subscribes.map(id => mongoose.Types.ObjectId.createFromHexString(id));
    }

    // Set the subscribes field to an empty array
    //user.subscribes = [];
    user.updatedAt = new Date();
    await user.save();

    // Populate the subscribes field
    const populatedUser = await User.findById(userId).populate({
      path: 'subscribes',
      model: Subscription 
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: populatedUser
      }
    });
  } catch (error) {
    console.error("Error in unsubscribe route:", error);
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

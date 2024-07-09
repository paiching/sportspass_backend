const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require("../models/usersModel"); 
const Event = require('../models/eventsModel');
const Order = require('../models/ordersModel');
const Subscription = require('../models/subscriptionModel');
const Tag = require('../models/tagsModel'); 
const AppError = require('../appError');
const verifyToken = require('../middlewares/verifyToken');  
const sendEmail = require('../utils/sendEmail');
const { generateSendJWT } = require('../utils/jwt');



/* GET users listing. */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 })
    // .populate({
    //   path: 'subscribes',
    //   model: Subscription 
    // })
    // .populate({
    //   path: 'focusedEvents',
    //   model: Event 
    // });

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

// GET user profile with orders
router.get('/profile/:id', verifyToken, async (req, res, next) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId, '-password')
      .populate({
        path: 'subscribes',
        model: Subscription,
        populate: [
          { path: 'sponsor', select: 'name' },
          { path: 'tag', select: 'name' }
        ]
      })
      .populate('focusedEvents')
      .populate({
        path: 'orders',
        populate: {
          path: 'ticketId',
          populate: [
            {
              path: 'eventId',
              model: 'Event', // Model name of the event
              select: 'eventName eventPic' // Specify the fields you want to include from the Event model
            },
            {
              path: 'sessionId',
              model: 'Session', // Model name of the session
              select: 'sessionName sessionTime sessionPlace' // Specify the fields you want to include from the Session model
            }
          ]
        }
      });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const focusedEvents = await Promise.all(user.focusedEvents.map(async (event) => {
      const sessions = event.sessionSetting;

      // 賽事地點 (eventPlace)
      const eventPlace = sessions.reduce((closestSession, session) => {
        return !closestSession || new Date(session.sessionTime) < new Date(closestSession.sessionTime)
          ? session
          : closestSession;
      }, null)?.sessionPlace;

      // 賽事日期 (eventDate)
      const eventDateStart = sessions.length > 0 ? new Date(Math.min(...sessions.map(s => new Date(s.sessionTime)))) : null;
      const eventDateEnd = sessions.length > 0 ? new Date(Math.max(...sessions.map(s => new Date(s.sessionTime)))) : null;
      const eventDate = eventDateStart && eventDateEnd ? `${eventDateStart.toISOString()} - ${eventDateEnd.toISOString()}` : null;

      // 賽事價錢 (price)
      const price = Math.min(...sessions.flatMap(s => s.areaSetting.map(a => a.areaPrice)));

      // 售票人數 (ticketSales)
      const ticketSales = sessions.flatMap(s => s.areaSetting.flatMap(a => a.areaTicketType.map(t => t.areaNumber))).reduce((sum, num) => sum + num, 0);

      // tagList
      const tagNames = await Tag.find({ _id: { $in: event.tagList } }).select('name').exec();

      // 新的 event 对象
      return {
        ...event.toObject(),
        eventPlace,
        eventDate,
        tagList: tagNames.map(tag => tag.name),
        price,
        ticketSales,
        sessionSetting: undefined // 移除 sessionSetting
      };
    }));

    const ordersWithModifiedFields = user.orders.map(order => {
      const orderObject = order.toObject();
      orderObject.ticketList = orderObject.ticketId.map(ticket => {
        const eventDetails = ticket.eventId || {}; // Ensure eventDetails is not null
        const sessionDetails = ticket.sessionId || {}; // Ensure sessionDetails is not null

        return {
          ...ticket,
          eventDetails,
          sessionDetails,
          eventId: undefined,
          sessionId: undefined,
          eventName: eventDetails.eventName || 'Unknown Event',
          eventPic: eventDetails.eventPic || '',
          sessionTime: sessionDetails.sessionTime || 'Unknown Time',
          sessionName: sessionDetails.sessionName || 'Unknown Session',
          sessionPlace: sessionDetails.sessionPlace || 'Unknown Place',
          seats: `${ticket.areaName}${ticket.seatNumber}`
        };
      });
      delete orderObject.ticketId;
      return orderObject;
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          ...user.toObject(),
          focusedEvents,
          orders: ordersWithModifiedFields // Include orders with detailed information
        }
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
    // Check if the email already exists
    const emailExists = await User.findOne({ email });

    if (emailExists) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Validate that the password is provided
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // If account is not provided, generate a default account based on email
    const accountToUse = account || email.split('@')[0];

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      account: accountToUse,
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

  if ((!email && !account) || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide email or account and password'
    });
  }

  try {
    // Construct the query object dynamically
    let query = {};
    if (email) {
      query.email = email;
    } else if (account) {
      query.account = account;
    }

    // Find the user by email or account, ensuring to include the password field
    const user = await User.findOne(query).select('+password');

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

    // Remove sensitive fields before sending the response
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    generateSendJWT(user, 200, res);
  } catch (error) {
    console.error('Error during login process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
});

// Forgot Password Route
router.post('/forgotPassword', async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('沒有使用這個電子郵件地址的用戶。', 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/user/resetPassword/${resetToken}`;
    const message = `忘記密碼了嗎？提交一個帶有新密碼的 POST 請求到：${resetURL}。如果你沒有忘記密碼，請忽略這封電子郵件！`;

    try {
      await sendEmail({
        email: user.email,
        subject: '你的密碼重置令牌（有效期為 10 分鐘）',
        message
      });

      res.status(200).json({
        status: 'success',
        message: '令牌已發送到電子郵件！'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('發送電子郵件時發生錯誤。稍後再試！', 500));
    }
  } catch (error) {
    next(error);
  }
});

// Reset Password Routes
router.get('/resetPassword/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired'
      });
    }

    // Render a form for the user to enter a new password
    res.status(200).send(`
      <form action="/api/v1/user/resetPassword/${token}" method="POST">
        <input type="password" name="password" placeholder="New Password" required />
        <button type="submit">Reset Password</button>
      </form>
    `);
  } catch (error) {
    next(error);
  }
});

router.post('/resetPassword/:token', async (req, res, next) => {
  
  try {
    const { token } = req.params;
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired'
      });
    }

    // Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

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


// READ orders by userId
router.get('/:userId/order', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
    .populate({
      path: 'ticketId',
      populate: [
        {
          path: 'eventId',
          model: 'Event', // Model name of the event
          select: 'eventName eventPic' // Specify the fields you want to include from the Event model
        },
        {
          path: 'sessionId',
          model: 'Session', // Model name of the session
          select: 'sessionName sessionTime sessionPlace' // Specify the fields you want to include from the Session model
        }
      ]
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No orders found for this user'
      });
    }

    // Convert ticketId to ticketList, eventId to eventDetail, and sessionId to sessionDetail
    const ordersWithModifiedFields = orders.map(order => {
      const orderObject = order.toObject();
      orderObject.ticketList = orderObject.ticketId.map(ticket => {
        const eventDetails = ticket.eventId || {}; // Ensure eventDetails is not null
        const sessionDetails = ticket.sessionId || {}; // Ensure sessionDetails is not null

        return {
          ...ticket,
          eventDetails,
          sessionDetails,
          eventId: undefined,
          sessionId: undefined,
          eventName: eventDetails.eventName || 'Unknown Event',
          eventPic: eventDetails.eventPic || '',
          sessionTime: sessionDetails.sessionTime || 'Unknown Time',
          sessionName: sessionDetails.sessionName || 'Unknown Session',
          sessionPlace: sessionDetails.sessionPlace || 'Unknown Place',
          seats: `${ticket.areaName}${ticket.seatNumber}`
        };
      });
      delete orderObject.ticketId;
      return orderObject;
    });

    res.status(200).json({
      status: 'success',
      data: {
        orders: ordersWithModifiedFields
      }
    });
  } catch (error) {
    console.error("Error fetching orders by userId", error);
    res.status(500).send("Error fetching orders by userId");
  }
});



module.exports = router;

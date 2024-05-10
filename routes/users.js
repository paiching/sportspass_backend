const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const router = express.Router();
const mongoose = require('mongoose');
const User = require("../models/usersModel"); 
const { client, connect } = require('../db');
const AppError = require('../appError');
const  verifyToken  = require('../middlewares/verifyToken');  // Ensure this path is correct


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
      const dbClient = await connect();
      const collection = dbClient.collection("users");
      const users = await collection.find({}).toArray();
      res.status(200).json(users);
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).send("Error accessing the database");
    }
  });


  router.post('/register', async (req, res, next) => {

    const { account, password, email, phone, role } = req.body;
    console.log("Received:", req.body);  // Logging the received body to check if all data is received correctly
    
    try {
        // Connect to the database
        const dbClient = await connect();
        const collection = dbClient.collection("users");

        // Check if the account or email already exists
        const userExists = await collection.findOne({
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

        // Insert the new user
        const result = await collection.insertOne({
            account,
            email,
            password: hashedPassword,
            phone,
            role,
            active: true,
            createdAt: new Date(),  // Manually set the creation date
            updatedAt: new Date()   // Manually set the update date
        });

        if (result.acknowledged) {
          const newUser = await collection.findOne({ _id: result.insertedId });
          generateSendJWT(newUser, 201, res);
        } else {
          throw new Error('User registration failed');
        }
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
        const dbClient = await connect();
        const collection = dbClient.collection("users");

        // Check if the account already exists
        const user = await collection.findOne({ email });

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
    const dbClient = await connect();
    const collection = dbClient.collection("users");

    // Check if the user exists
    const user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
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
    const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: updates });
    if (result.modifiedCount === 1) {
      // Fetch the updated user data to include in the response
      const updatedUser = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      return res.status(200).json({
        status: 'success',
        data: {
          user: updatedUser
        }
      });
    } else {
      throw new Error('User update failed');
    }
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
    const dbClient = await connect();
    const collection = dbClient.collection("users");

    // Check if the user exists
    const user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Soft delete the user by marking as inactive
    const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { active: false } });
    if (result.modifiedCount === 1) {
      return res.status(200).json({
        status: 'success',
        data: {}
      }); // Successfully soft deleted, return success status and empty data
    } else {
      throw new Error('User soft deletion failed');
    }
  } catch (error) {
    console.error("Error in delete user route:", error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
});


module.exports = router;

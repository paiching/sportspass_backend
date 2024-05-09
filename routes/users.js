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
console.log('After importing verifyToken:', verifyToken);

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
    try {
        const { account, password, email, phone, role } = req.body;

        // Connect to the database
        const dbClient = await connect();
        const collection = dbClient.collection("users");

        // Check if the account already exists
        const userExists = await collection.findOne({ account });
        if (userExists) {
            return next(new AppError(400, 'Account already exists'));
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert the new user
        const result  = await collection.insertOne({
            account,
            email,
            password: hashedPassword,
            phone,
            role
        });

      if (result.acknowledged) {
          // Fetch the newly created user document to pass to generateSendJWT
          const newUser = await collection.findOne({ _id: result.insertedId });
          generateSendJWT(newUser, 201, res);
      } else {
          throw new Error('User registration failed');
      }
    } catch (error) {
        console.error("Error in sign-up route:", error);
        next(error);
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

module.exports = router;

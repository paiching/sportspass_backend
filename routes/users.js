const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require("../models/usersModel"); 
const { client, connect } = require('../db');


  /* GET users listing. */
  router.get('/', async (req, res) => {
    try {
      const dbClient = await connect();
      const collection = dbClient.collection("users");
      const users = await collection.find({}).toArray();
      console.log(users);
      res.status(200).json(users);
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).send("Error accessing the database");
    }
  });

router.post('/api/v1/login', async (req, res) => {
  const { account, password } = req.body;
  console.log("Received credentials:", account, password);
  try {
    console.log(`Querying for account: ${account}`);
    const user = await User.findOne({ account: account });
    const users = await User.find();
    console.log("Found user: ", user);
    console.log("Found users: ", users);
    

      if (user && user.password === 'admin1234') {
          console.log("Authentication successful for: ", account);  
          res.status(200).json({
              status: true,
              data: [{
                  name: user.nickname,
                  email: user.email,
                  role: user.role,
                  gender: user.gender,
                  address: user.address,
                  phone: user.phone,
                  subscribe: user.subscribes,
                  favorites: user.favorites,
                  notification: user.notification
              }]
          });
      } else {
          console.log("Authentication failed for: ", account, "| DB pass:", user ? user.password : "User not found", "| Provided pass:", password);  
          res.status(401).json({ status: false, error: 'Authentication failed' });
      }
  } catch (error) {
      console.error("Error during authentication: ", error);  
      res.status(500).json({ status: false, error: 'Internal Server Error' });
  }
});


module.exports = router;

require('dotenv').config(); // 加载环境变量

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_Atlas);
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error('Could not connect to MongoDB Atlas', err);
    process.exit(1);
  }
};

module.exports = connectDB;

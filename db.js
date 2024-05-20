const mongoose = require('mongoose');
const { Schema } = mongoose;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_Atlas, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
     // dbName: 'mydatabase' // 替换为你的数据库名称
    });
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error('Could not connect to MongoDB Atlas', err);
    process.exit(1);
  }
};

module.exports = connectDB;

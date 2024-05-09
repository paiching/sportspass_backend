const mongoose = require('mongoose');
const Schema = mongoose.Schema;  

const userSchema = new mongoose.Schema({
    account: { type: String, required: true, index: true },
    password: {
      type: String,
      required: true,
      select: true  
    }, 
    email: {
      type: String,
      required: [true, '請輸入您的 Email'],
      unique: true,
      lowercase: true,
      select: true
    },
   
    role: { type: Number, required: true},
    gender: { type: Number },
    address: { type: String },
    phone: { type: String },
    nickname: { type: String},
    subscribes: { type: Schema.Types.ObjectId },
    favorites: { type: Schema.Types.ObjectId },
    notification: { type: Boolean}
    
  });

const User = mongoose.model('user', userSchema);

module.exports = User;

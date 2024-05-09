const mongoose = require('mongoose');
const Schema = mongoose.Schema;  

const userSchema = new mongoose.Schema({
  account: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  role: { type: Number, required: true },
  gender: { type: Number },
  address: { type: String },
  nickname: { type: String },
  subscribes: { type: Schema.Types.ObjectId },
  favorites: { type: Schema.Types.ObjectId },
  notification: { type: Boolean }
});


const User = mongoose.model('user', userSchema);

module.exports = User;

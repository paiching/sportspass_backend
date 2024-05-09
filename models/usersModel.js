const mongoose = require('mongoose');
const Schema = mongoose.Schema;  

const userSchema = new mongoose.Schema({
  account: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String },
  role: { type: Number, required: true },
  gender: { type: Number },
  address: { type: String },
  nickname: { type: String },
  subscribes: { type: Schema.Types.ObjectId },
  favorites: { type: Schema.Types.ObjectId },
  notification: { type: Boolean }
});

// This will ensure indexes are created for fields marked `unique`
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ account: 1 }, { unique: true });

const User = mongoose.model('user', userSchema);

module.exports = User;

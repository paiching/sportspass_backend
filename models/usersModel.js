const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  account: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: Number, required: true },
  gender: { type: String },
  address: { type: String },
  photo: { type: String },
  nickname: { type: String },
  subscribes: [{ type: Schema.Types.ObjectId, ref: 'Subscription' }],
  focusedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
  favorites: [{ type: Schema.Types.ObjectId, ref: 'Favorite' }],
  orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  notification: { type: Boolean },
  active: { type: Boolean, default: true },
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true // This will add createdAt and updatedAt fields
});

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 分鐘

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

const mongoose = require('mongoose');
const { Schema } = mongoose;

const sponsorSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId, required: true },
  name: { type: String, required: true }
}, { _id: false });

const tagSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId, required: true },
  name: { type: String, required: true }
}, { _id: false });

const subscriptionSchema = new Schema({
  type: { type: String, required: true },
  sponsor: sponsorSchema,
  tag: tagSchema,
  createdAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true },
  status: { type: Number, default: 1, required: true }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;

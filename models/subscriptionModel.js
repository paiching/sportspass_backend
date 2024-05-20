const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema({
  type: { type: String, required: true },
  sponsor: {
    _id: { type: Schema.Types.ObjectId, ref: 'Sponsor' },
    name: { type: String }
  },
  tag: {
    _id: { type: Schema.Types.ObjectId, ref: 'Tag' },
    name: { type: String }
  },
  createdAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;

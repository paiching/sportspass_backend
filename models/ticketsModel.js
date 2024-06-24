const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Ticket Schema
const ticketSchema = new Schema({
  //ticketId: { type: mongoose.Schema.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  ticketName: { type: String, required: true },
  ticketDiscount: { type: String, required: true },
  areaColor: { type: String, required: true },
  areaName: { type: String, required: true },
  price: { type: String, required: true },
  status: { type: Number, required: true, enum: [0, 1, 2], default: 0 }, // 0: 未使用, 1: 已使用, 2: 退票
  unTicketReason: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

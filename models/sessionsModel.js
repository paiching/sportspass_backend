const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketTypeSchema = new Schema({
  ticketName: { type: String, required: true },
  ticketDiscount: { type: Number, required: true },
  areaNumber: { type: Number, required: true }
}, { _id: false });  // 禁用自動生成 _id

const areaSettingSchema = new Schema({
  areaVenuePic: { type: String, required: true },
  areaColor: { type: String, required: true },
  areaName: { type: String, required: true },
  areaPrice: { type: Number, required: true },
  areaTicketType: [ticketTypeSchema]
}, { _id: false });  // 禁用自動生成 _id

const sessionSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sessionTime: { type: Date, required: true },
  sessionName: { type: String, required: true },
  sessionPlace: { type: String, required: true },
  sessionSalesPeriod: { type: Date, required: true },
  areaSetting: [areaSettingSchema],
  orderId: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  notifyId: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
  sessionState: { type: String },
  bookTicket: { type: Number },
  enterVenue: { type: Number },
  seatsTotal: { type: Number },
  detailEventUrl: { type: String },
  seatsAvailable: { type: Number },
  isSoldOut: { type: Boolean }
}, {
  timestamps: true
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = { Session };

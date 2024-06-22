const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketTypeSchema = new Schema({
  ticketName: { type: String, required: true },
  ticketDiscount: { type: Number, required: true }
}, { _id: false });  // 禁用自動生成 _id

const areaSettingSchema = new Schema({
  areaColor: { type: String, required: true },
  areaName: { type: String, required: true },
  areaPrice: { type: Number, required: true },
  areaNumber: { type: Number, required: true },
  areaTicketType: [ticketTypeSchema]
}, { _id: false });  

const sessionSettingSchema = new Schema({
  sessionTime: { type: Date, required: true },
  sessionName: { type: String, required: true },
  sessionPlace: { type: String, required: true },
  sessionSalesPeriod: [Date], 
  areaVenuePic: { type: String, required: true },
  areaSetting: [areaSettingSchema]
}, { _id: false });  

const eventSchema = new Schema({
  eventName: { type: String, required: true },
  eventDate: [Date], 
  eventPic: { type: String, required: true },
  coverPic: { type: String, required: true },
  smallBanner: { type: String, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  tagList: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  releaseDate: { type: Date, required: true },
  sponsorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventIntro: { type: String, required: true },
  sessionList: [{ type: Schema.Types.ObjectId, ref: 'Session' }],
  sessionSetting: [sessionSettingSchema],
  status: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true // 這會添加 createdAt 和 updatedAt 字段
});

const Event = mongoose.model('Event', eventSchema);

module.exports = { Event };

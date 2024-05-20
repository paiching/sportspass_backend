const mongoose = require('mongoose');
const { Schema } = mongoose;

const areaTicketTypeSchema = new Schema({
    ticketName: { type: String, required: true },
    ticketDiscount: { type: Number, required: true },
    areaNumber: { type: Number, required: true }
});

const areaSettingSchema = new Schema({
    areaVenuePic: { type: String, required: true },
    areaColor: { type: String, required: true },
    areaName: { type: String, required: true },
    areaPrice: { type: Number, required: true },
    areaTicketType: [areaTicketTypeSchema]
});

const sessionSchema = new Schema({
    eventId: { type: mongoose.Schema.ObjectId, ref: 'Event', required: true },
    isEdit: { type: Boolean },
    sessionName: { type: String, required: true },
    sessionTime: { type: Date, required: true },
    sessionPlace: { type: String, required: true },
    sessionSalesPeriod: { type: Date, required: true },
    areaSetting: [areaSettingSchema],
    orderId: [{ type: mongoose.Schema.ObjectId, ref: 'Order' }],
    notifyId: [{ type: mongoose.Schema.ObjectId, ref: 'Notification' }],
    sessionState: { type: String },
    bookTicket: { type: Number },
    enterVenue: { type: Number },
    seatsTotal: { type: Number },
    detailEventUrl: { type: String },
    seatsAvailable: { type: Number },
    isSoldOut: { type: Boolean }
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

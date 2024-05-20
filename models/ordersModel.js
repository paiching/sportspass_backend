const mongoose = require('mongoose');
const { Schema } = mongoose;

const seatSchema = new Schema({
    seatNumber: { type: Number, required: true },
    isBooked: { type: Boolean, default: false }
});


const orderSchema = new Schema({
   
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sponsorId: { type: Schema.Types.ObjectId, ref: 'Sponsor' },
    ticketId: [{ type: Schema.Types.ObjectId, ref: 'Ticket' }],
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    salesList: [{ type: Schema.Types.ObjectId, ref: 'Sale' }],
    ticketSales: { type: Number },
    salesTotal: { type: Number },
    unTicket: { type: Number },
    unTicketTotal: { type: Number },
    orderTotal: { type: Number },
    totalAmount: { type: Number, required: true },
    orderState: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

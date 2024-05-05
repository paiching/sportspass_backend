const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    price: { type: String, required: true },
    status: { type: Boolean, required: true },
    unTicketReason: { type: String, required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

const mongoose = require('mongoose');
const { Schema } = mongoose;


const orderSchema = new Schema({

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: [{ type: Schema.Types.ObjectId, ref: 'Ticket' }],
    ticketSales: { type: Number },
    salesTotal: { type: Number },
    orderTotal: { type: Number },
    seats: [{ type:String }],
    totalAmount: { type: Number, required: true },
    status: { type: Number, required: true, enum: [0, 1, 2], default: 0 }, // 0: 未付款, 1: 已付款 
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

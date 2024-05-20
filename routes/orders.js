const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/ordersModel');
const Event = require('../models/eventsModel');

/* POST create a new order. */
router.post('/create', async (req, res) => {
  try {
    const {
      orderList, userId, sponsorId, ticketId, eventId, sessionId, salesList,
      ticketSales, salesTotal, unTicket, unTicketTotal, orderTotal, totalAmount, orderState
    } = req.body;

    // 创建新的订单
    const newOrder = new Order({
      orderList,
      userId,
      sponsorId,
      ticketId,
      eventId,
      sessionId,
      salesList,
      ticketSales,
      salesTotal,
      unTicket,
      unTicketTotal,
      orderTotal,
      totalAmount,
      orderState,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newOrder.save();

    // 更新相关的 Event，将新创建的 orderId 添加到 orderId 数组中
    await Event.findByIdAndUpdate(eventId, { $push: { orderId: newOrder._id } });

    res.status(201).json({
      status: 'success',
      data: {
        order: newOrder
      }
    });
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).send("Error creating order");
  }
});

module.exports = router;

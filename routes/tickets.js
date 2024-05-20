const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Ticket = require('../models/ticketsModel'); // 确保模型引用正确
const Order = require('../models/ordersModel'); // 确保模型引用正确
const Event = require('../models/eventsModel'); // 确保模型引用正确
const Session = require('../models/sessionsModel'); // 确保模型引用正确
const  verifyToken  = require('../middlewares/verifyToken');  

/* GET tickets listing. */
router.get('/list', verifyToken, async (req, res) => {
  try {
    console.log("Fetching tickets from database..."); // 添加调试日志
    const tickets = await Ticket.find({})
      .populate({
        path: 'orderId',
        select: 'orderList userId sponsorId eventId sessionId totalAmount orderState createdAt updatedAt'
      })
      .populate({
        path: 'eventId',
        select: 'eventName eventDate eventPic coverPic smallBanner categoryId tagId releaseDate eventIntro sessionId sponsorId favoriteId createdAt updatedAt'
      })
      .populate({
        path: 'sessionId',
        select: 'sessionName sessionTime sessionPlace sessionSalesPeriod areaSetting sessionState bookTicket enterVenue seatsTotal detailEventUrl seatsAvailable isSoldOut createdAt updatedAt'
      });

    console.log("Tickets fetched: ", tickets); // 添加调试日志

    res.status(200).json({
      status: 'success',
      data: {
        tickets
      }
    });
  } catch (error) {
    console.error("Database query failed", error);
    res.status(500).send("Error accessing the database");
  }
});

/* POST create a new ticket. */
router.post('/create', async (req, res) => {
  try {
    const { orderId, eventId, sessionId, price, status, unTicketReason, notes } = req.body;

    // 验证相关的订单、事件和会话是否存在
    const order = await Order.findById(orderId);
    const event = await Event.findById(eventId);
    const session = await Session.findById(sessionId);

    if (!order || !event || !session) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid orderId, eventId, or sessionId' 
      });
    }

    // 创建新的票据
    const newTicket = new Ticket({
      ticketId: new mongoose.Types.ObjectId(),
      orderId,
      eventId,
      sessionId,
      price,
      status,
      unTicketReason,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newTicket.save();

    res.status(201).json({
      status: 'success',
      data: {
        ticket: newTicket
      }
    });
  } catch (error) {
    console.error("Error creating ticket", error);
    res.status(500).send("Error creating ticket");
  }
});


// Update ticket status by ticketId
router.patch('/status', async (req, res) => {
  try {
    const { ticketId, status } = req.body;

    // Find the ticket by ticketId and update its status
    const updatedTicket = await Ticket.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(ticketId) },
      { status: status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ticket: updatedTicket
      }
    });
  } catch (error) {
    console.error("Error updating ticket status", error);
    res.status(500).send("Error updating ticket status");
  }
});


module.exports = router;


const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Order = require('../models/ordersModel');
const  Event = require('../models/eventsModel'); // 確保正確引入 Event 模型
const Sponsor = require('../models/usersModel');
const Ticket = require('../models/ticketsModel');
const { Session } = require('../models/sessionsModel');
const verifyToken = require('../middlewares/verifyToken');
const jwt = require('jsonwebtoken'); // 引入 jwt 模組


// 提取 userID 的函數
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
};

router.post('/', verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = getUserIdFromToken(req);
    console.log('UserId extracted from token:', userId);

    const { eventId, sessionId, cart, total } = req.body;
    console.log('Request body:', req.body);

    const ticketIds = [];
    let ticketSales = 0;
    let salesTotal = 0;
    const seats = [];
    let seatCounter = 1;

    const newOrder = new Order({
      userId,
      ticketSales,
      salesTotal,
      orderTotal: 0, // 將在稍後更新
      seats, // 初始化 seats
      totalAmount: total,
      status: 0, // 初始狀態為未付款
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      await newOrder.save({ session });
    } catch (orderError) {
      console.error("Error saving order:", orderError);
      throw orderError;
    }

    for (const cartItem of cart) {
      const { areaColor, areaName, ticketName, ticketDiscount, ticketNumber, price } = cartItem;

      for (let i = 0; i < ticketNumber; i++) {
        const seatNumber = `${areaName}${seatCounter++}`;
        const ticket = new Ticket({
          orderId: newOrder._id,
          eventId,
          sessionId,
          areaColor,
          areaName,
          ticketName,
          ticketDiscount,
          seatNumber,
          price,
          status: 0 // 初始狀態為未使用
        });

        try {
          const savedTicket = await ticket.save({ session });
          ticketIds.push(savedTicket._id);
          seats.push(seatNumber); // 添加 seatNumber 到 seats 數組中
        } catch (ticketError) {
          console.error("Error saving ticket:", ticketError);
          throw ticketError;
        }
      }

      ticketSales += ticketNumber;
      salesTotal += price * ticketNumber;
    }

    newOrder.ticketId = ticketIds;
    newOrder.ticketSales = ticketSales;
    newOrder.salesTotal = salesTotal;
    newOrder.orderTotal = salesTotal;
    newOrder.seats = seats; // 更新 seats 信息

    try {
      await newOrder.save({ session });
    } catch (orderError) {
      console.error("Error updating order:", orderError);
      throw orderError;
    }

    const sessionToUpdate = await Session.findById(sessionId).exec();

    if (!sessionToUpdate) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    for (const cartItem of cart) {
      const { areaName, ticketNumber } = cartItem;

      const areaToUpdate = sessionToUpdate.areaSetting.find(
        (area) => area.areaName === areaName
      );

      if (!areaToUpdate) {
        throw new Error(`Area with name ${areaName} not found in session ${sessionId}`);
      }

      areaToUpdate.areaNumber -= ticketNumber;

      if (areaToUpdate.areaNumber < 0) {
        throw new Error(`Insufficient seats available in area ${areaName}`);
      }
    }

    const seatsAvailable = sessionToUpdate.areaSetting.reduce((total, area) => total + area.areaNumber, 0);
    const seatsTotal = sessionToUpdate.seatsTotal;

    sessionToUpdate.bookTicket = seatsTotal - seatsAvailable;
    sessionToUpdate.seatsAvailable = seatsAvailable;
    sessionToUpdate.isSoldOut = seatsAvailable <= 0;

    try {
      await Session.findByIdAndUpdate(sessionId, {
        areaSetting: sessionToUpdate.areaSetting,
        bookTicket: sessionToUpdate.bookTicket,
        seatsAvailable: sessionToUpdate.seatsAvailable,
        isSoldOut: sessionToUpdate.isSoldOut
      }, { session });
    } catch (sessionUpdateError) {
      console.error("Error updating session with new order data:", sessionUpdateError);
      throw sessionUpdateError;
    }

    const updatedEvent = await Event.findById(eventId).exec();
    if (!updatedEvent) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const seatsAvailableInEvent = updatedEvent.sessionList.reduce((total, session) => total + session.seatsAvailable, 0);
    const seatsTotalInEvent = updatedEvent.sessionList.reduce((total, session) => total + session.seatsTotal, 0);

    updatedEvent.isSoldOut = seatsAvailableInEvent <= 0;

    try {
      await updatedEvent.save({ session });
    } catch (eventUpdateError) {
      console.error("Error updating event with new order data:", eventUpdateError);
      throw eventUpdateError;
    }

    // 更新用戶的訂單列表
    try {
      await User.findByIdAndUpdate(userId, {
        $push: { orders: newOrder._id }
      }, { session });
    } catch (userUpdateError) {
      console.error("Error updating user with new order data:", userUpdateError);
      throw userUpdateError;
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: {
        order: newOrder
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating order:", error);
    res.status(500).send(`Error creating order: ${error.message}`);
  }
});


// READ all orders
router.get('/list', async (req, res) => {
  try {
    const orders = await Order.find().populate({
      path: 'ticketId',
      populate: [
        {
          path: 'eventId',
          model: 'Event', // Model name of the event
          select: 'eventName eventPic' // Specify the fields you want to include from the Event model
        },
        {
          path: 'sessionId',
          model: 'Session', // Model name of the session
          select: 'sessionName sessionTime sessionPlace' // Specify the fields you want to include from the Session model
        }
      ]
    });

    // Convert ticketId to ticketList, eventId to eventDetail, and sessionId to sessionDetail
    const ordersWithModifiedFields = orders.map(order => {
      const orderObject = order.toObject();
      orderObject.ticketList = orderObject.ticketId.map(ticket => {
        const eventDetails = ticket.eventId || {}; // Ensure eventDetails is not null
        const sessionDetails = ticket.sessionId || {}; // Ensure sessionDetails is not null

        return {
          ...ticket,
          eventDetails,
          sessionDetails,
          eventId: undefined,
          sessionId: undefined,
          eventName: eventDetails.eventName || 'Unknown Event',
          eventPic: eventDetails.eventPic || '',
          sessionTime: sessionDetails.sessionTime || 'Unknown Time',
          sessionName: sessionDetails.sessionName || 'Unknown Session',
          sessionPlace: sessionDetails.sessionPlace || 'Unknown Place',
          seats: `${ticket.areaName}${ticket.seatNumber}`
        };
      });
      delete orderObject.ticketId;
      return orderObject;
    });

    res.status(200).json({
      status: 'success',
      data: {
        orders: ordersWithModifiedFields
      }
    });
  } catch (error) {
    console.error("Error fetching orders", error);
    res.status(500).send("Error fetching orders");
  }
});


// READ a specific order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('ticketId');
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        order
      }
    });
  } catch (error) {
    console.error("Error fetching order", error);
    res.status(500).send("Error fetching order");
  }
});

// UPDATE a specific order by ID
router.patch('/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updatedOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        order: updatedOrder
      }
    });
  } catch (error) {
    console.error("Error updating order", error);
    res.status(500).send("Error updating order");
  }
});

// DELETE a specific order by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Update the related Event, removing the deleted orderId from the orderId array
    await Event.findByIdAndUpdate(deletedOrder.eventId, { $pull: { orderId: deletedOrder._id } });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error("Error deleting order", error);
    res.status(500).send("Error deleting order");
  }
});





module.exports = router;

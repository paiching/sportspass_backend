const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Order = require('../models/ordersModel');
const Event = require('../models/eventsModel');
const Sponsor = require('../models/usersModel');



// CREATE a new order
router.post('/', async (req, res) => {
  try {
    const {
      userId, sponsorId, ticketId, eventId, sessionId, salesList,
      ticketSales, salesTotal, unTicket, unTicketTotal, orderTotal, totalAmount, orderState
    } = req.body;

    // Create a new order
    const newOrder = new Order({
      userId,
      sponsorId,
      ticketId,
      //eventId,
      //sessionId,
      //salesList,
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

    // Update the related Event, adding the new orderId to the orderId array
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

// READ all orders
router.get('/list', async (req, res) => {
  try {
    const orders = await Order.find().populate({
      path: 'ticketId',
      populate: [
        {
          path: 'eventId',
          model: 'Event', // Model name of the event
          select: 'eventName' // Specify the fields you want to include from the Event model
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
        return {
          ...ticket,
          eventDetails: ticket.eventId,
          sessionDetails: ticket.sessionId,
          eventId: undefined,
          sessionId: undefined
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
    const order = await Order.findById(req.params.id).populate('eventId sessionId userId ticketId sponsorId salesList');
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

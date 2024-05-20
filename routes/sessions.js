const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Session = require('../models/sessionsModel');
const Event = require('../models/eventsModel');

// GET all sessions
router.get('/list', async (req, res) => {
  try {
    const sessions = await Session.find().populate('eventId');
    res.status(200).json({
      status: 'success',
      data: {
        sessions
      }
    });
  } catch (error) {
    console.error("Error fetching sessions", error);
    res.status(500).send("Error fetching sessions");
  }
});

// GET a single session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('eventId');
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    console.error("Error fetching session", error);
    res.status(500).send("Error fetching session");
  }
});

// CREATE a new session
router.post('/', async (req, res) => {
  try {
    const { eventId, sessionName, sessionTime, sessionPlace, sessionSalesPeriod, orderId, sessionState, bookTicket, enterVenue, seatsTotal, detailEventUrl, seatsAvailable, isSoldOut } = req.body;

    // 验证相关的事件是否存在
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid eventId'
      });
    }

    // 创建新的会话
    const newSession = new Session({
      eventId,
      sessionName,
      sessionTime,
      sessionPlace,
      sessionSalesPeriod,
      orderId,
      sessionState,
      bookTicket,
      enterVenue,
      seatsTotal,
      detailEventUrl,
      seatsAvailable,
      isSoldOut,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newSession.save();

    // 将新创建的会话ID添加到事件的sessionIds数组中
    event.sessionIds.push(newSession._id);
    await event.save();

    res.status(201).json({
      status: 'success',
      data: {
        session: newSession
      }
    });
  } catch (error) {
    console.error("Error creating session", error);
    res.status(500).send("Error creating session");
  }
});

// UPDATE a session by ID
router.patch('/:id', async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    console.error("Error updating session", error);
    res.status(500).send("Error updating session");
  }
});

// DELETE a session by ID
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    // 将删除的会话ID从事件的sessionIds数组中移除
    await Event.updateOne({ _id: session.eventId }, { $pull: { sessionIds: session._id } });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error("Error deleting session", error);
    res.status(500).send("Error deleting session");
  }
});

module.exports = router;

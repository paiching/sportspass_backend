const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Session } = require('../models/sessionsModel');
const { Event } = require('../models/eventsModel');

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
    const session = await Session.findById(req.params.id).populate({
      path: 'eventId',
      select: '-sessionList -status -createdAt -updatedAt -sessionSetting -__v'  // 排除不需要的字段
    });
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    // 計算 seatsAvailable
    let totalSeatsAvailable = 0;
    session.areaSetting.forEach(area => {
      totalSeatsAvailable += area.areaNumber;
    });
    session.seatsAvailable = totalSeatsAvailable;

    res.status(200).json({
      status: 'success',
      data: {
        session: session.toObject()
      }
    });
  } catch (error) {
    console.error("Error fetching session", error);
    res.status(500).send("Error fetching session");
  }
});

// PATCH API to update areaNumber in areaSetting
router.patch('/updateAreaNumber/:sessionId/:areaSettingId', async (req, res) => {
  const { sessionId, areaSettingId } = req.params;
  const { areaNumber } = req.body;

  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    const areaSetting = session.areaSetting.id(areaSettingId);
    if (!areaSetting) {
      return res.status(404).json({
        status: 'error',
        message: 'Area setting not found'
      });
    }

    areaSetting.areaNumber = areaNumber;

    // 更新 seatsAvailable
    let totalSeatsAvailable = 0;
    session.areaSetting.forEach(area => {
      totalSeatsAvailable += area.areaNumber;
    });
    session.seatsAvailable = totalSeatsAvailable;

    await session.save();

    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    console.error("Error updating areaNumber", error);
    res.status(500).send("Error updating areaNumber");
  }
});

module.exports = router;

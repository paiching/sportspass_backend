const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Session } = require('../models/sessionsModel');
const { Event } = require('../models/eventsModel');
const moment = require('moment');

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

    const now = moment();  // 獲取當前時間
    const salesStart = moment(session.sessionSalesPeriod[0]);  // 販賣區間開始時間
    const salesEnd = moment(session.sessionSalesPeriod[1]);  // 販賣區間結束時間

    // 根據時間決定是否進行座位計算
    let bookTicket = 0;
    let isSoldOut = false;
    let sessionState = "open";  // 預設狀態為 open
    let seatsAvailable = 0;

    if (now.isBefore(salesStart)) {
      // 如果當前時間小於販賣區間開始時間，顯示販賣區間的第一個時間
      bookTicket = "販賣區間尚未開始";
    } else if (now.isSameOrAfter(salesStart) && now.isBefore(salesEnd)) {
      // 當前時間在販賣區間內，進行座位計算
      let totalSeatsAvailable = 0;
      session.areaSetting.forEach(area => {
        totalSeatsAvailable += area.areaNumber;
      });
      session.seatsAvailable = totalSeatsAvailable;

      const seatsTotal = totalSeatsAvailable;
      bookTicket = session.bookTicket || 0;  // 需要確保有 bookTicket 的值

      if (seatsTotal > bookTicket) {
        seatsAvailable = seatsTotal - bookTicket;
        isSoldOut = false;
      } else if (seatsTotal === bookTicket) {
        seatsAvailable = 0;
        isSoldOut = true;
      }
    } else if (now.isSameOrAfter(salesEnd)) {
      // 當前時間超過販賣區間
      sessionState = "close";

      let totalSeatsAvailable = 0;
      session.areaSetting.forEach(area => {
        totalSeatsAvailable += area.areaNumber;
      });
      session.seatsAvailable = totalSeatsAvailable;

      const seatsTotal = totalSeatsAvailable;
      bookTicket = session.bookTicket || 0;  // 需要確保有 bookTicket 的值

      if (seatsTotal > bookTicket) {
        seatsAvailable = seatsTotal - bookTicket;
        isSoldOut = false;
      } else if (seatsTotal === bookTicket) {
        seatsAvailable = 0;
        isSoldOut = true;
      }
    }

    // 添加新的屬性
    const extendedSession = {
      ...session.toObject(),
      bookTicket: bookTicket,
      enterVenue: session.enterVenue || 0,  // 確保有 enterVenue 的值
      seatsTotal: session.seatsAvailable || 0,  // 確保有 seatsTotal 的值
      sessionState: sessionState,
      detailEventUrl: session.detailEventUrl || "",  // 確保有 detailEventUrl 的值
      isSoldOut: isSoldOut,
      seatsAvailable: seatsAvailable
    };

    res.status(200).json({
      status: 'success',
      data: {
        session: extendedSession
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

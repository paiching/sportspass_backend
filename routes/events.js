const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Types } = mongoose;
const { Event } = require('../models/eventsModel');
const { Session } = require('../models/sessionsModel');
const Category = require('../models/categoryModel');
const Tag = require('../models/tagsModel'); // 確保正確引入標籤模型
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/verifyToken');

// 提取 userID 的函數
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
};

// POST create a new event with sessions.
router.post('/', verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      eventSetting: {
        eventName, eventDate, eventPic, coverPic, smallBanner,
        categorysNameTC, tags, releaseDate, eventIntro
      },
      sessionSetting
    } = req.body;

    // 從JWT token中提取用戶ID
    const sponsorId = getUserIdFromToken(req);

    // Validate category ID
    const category = await Category.findOne({ nameTC: categorysNameTC }).session(session);
    if (!category) {
      throw new Error('無效的類別名稱');
    }

    // Validate and convert tag IDs, and update eventNum
    const tagIds = [];
    for (const tagName of tags) {
      const tag = await Tag.findOne({ name: tagName }).session(session);
      if (!tag) {
        throw new Error(`無效的標籤名稱: ${tagName}`);
      }
      tag.eventNum += 1; // 更新 eventNum
      await tag.save({ session });
      tagIds.push(tag._id);
    }

    // Create the event with sessionSetting array
    const newEvent = new Event({
      eventName,
      eventDate,
      eventPic,
      coverPic,
      smallBanner,
      categoryId: category._id,
      tagList: tagIds,
      releaseDate,
      sponsorId,
      eventIntro,
      sessionList: [], // 初始化 sessionList 為空數組
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedEvent = await newEvent.save({ session });

    // Create sessions and update sessionSetting with ids
    const sessionIds = [];
    for (const sessionData of sessionSetting) {
      const newSession = new Session({
        eventId: savedEvent._id,
        sessionName: sessionData.sessionName,
        sessionTime: sessionData.sessionTime,
        sessionPlace: sessionData.sessionPlace,
        sessionSalesPeriod: sessionData.sessionSalesPeriod,
        areaVenuePic: sessionData.areaVenuePic, // 添加 areaVenuePic
        areaSetting: sessionData.areaSetting
      });

      // 計算 seatsAvailable
      let totalSeatsAvailable = 0;
      newSession.areaSetting.forEach(area => {
        totalSeatsAvailable += area.areaNumber;
      });
      newSession.seatsAvailable = totalSeatsAvailable;

      const savedSession = await newSession.save({ session });

      // Add session id to sessionSetting
      sessionData.id = savedSession._id;
      sessionIds.push(savedSession._id);
    }

    // Save updated event with sessionList
    savedEvent.sessionList = sessionIds;
    await savedEvent.save({ session });

    // 更新 category 的 eventNum
    category.eventNum += 1;
    await category.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Populate category and tags
    const populatedEvent = await Event.findById(savedEvent._id)
      .populate('categoryId', 'nameTC')
      .populate('tagList', 'name')
      .populate({
        path: 'sessionList',
        populate: { path: 'areaSetting.areaTicketType', select: 'areaNumber' }
      });

    res.status(201).json({
      status: 'success',
      data: {
        event: populatedEvent
      }
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error creating event", error);

    let errorMessage;
    if (error.message.includes('無效的')) {
      errorMessage = error.message;
    } else {
      errorMessage = '創建事件時發生錯誤: ' + error.message;
    }

    res.status(400).json({
      status: 'error',
      message: errorMessage,
      details: error.stack
    });
  }
});

// GET a specific event by ID, including related sessions and calculating seatsAvailable
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'sessionList',
        populate: {
          path: 'areaSetting'
        }
      })
      .populate('categoryId')
      .populate('tagList')
      .exec();

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // 計算所有 areaNumber 的總和
    let totalSeatsAvailable = 0;
    event.sessionList.forEach(session => {
      session.areaSetting.forEach(area => {
        totalSeatsAvailable += area.areaNumber;
      });
    });

    // Convert to plain object to manipulate
    const eventObject = event.toObject();
    eventObject.seatsAvailable = totalSeatsAvailable;

    res.status(200).json({
      status: 'success',
      data: {
        event: eventObject
      }
    });
  } catch (error) {
    console.error("Error fetching event", error);
    res.status(500).send("Error fetching event");
  }
});

/* PUT update a specific event by ID. */
router.patch('/:id', async (req, res) => {
  try {
    const {
      eventName, eventDate, eventPic,
      coverPic, smallBanner, categoryId, tagId, releaseDate,
      eventIntro, sessionIds, status
    } = req.body;

    const updateData = {
      eventName,
      eventDate,
      eventPic,
      coverPic,
      smallBanner,
      categoryId: new mongoose.Types.ObjectId(categoryId),
      tagId: Array.isArray(tagId) ? tagId.map(id => new mongoose.Types.ObjectId(id)) : [],
      releaseDate,
      eventIntro,
      status,
      updatedAt: new Date()
    };

    if (sessionIds) {
      updateData.sessionList = sessionIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));
    }

    const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (error) {
    console.error("Error updating event", error);
    res.status(500).send("Error updating event");
  }
});

/* DELETE to change status of a specific event by ID to 0. */
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 0 }, { new: true });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (error) {
    console.error("Error updating event status", error);
    res.status(500).send("Error updating event status");
  }
});

module.exports = router;

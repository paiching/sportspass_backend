const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Types } = mongoose;
const  Event  = require('../models/eventsModel');
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
// router.get('/:id', async (req, res) => {
//   try {
//     const event = await Event.findById(req.params.id)
//       .populate({
//         path: 'sessionList',
//         populate: {
//           path: 'areaSetting'
//         }
//       })
//       .populate('categoryId')
//       .populate('tagList')
//       .exec();

//     if (!event) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Event not found'
//       });
//     }

//     // 計算所有 areaNumber 的總和
//     let totalSeatsAvailable = 0;
//     event.sessionList.forEach(session => {
//       session.areaSetting.forEach(area => {
//         totalSeatsAvailable += area.areaNumber;
//       });
//     });

//     // Convert to plain object to manipulate
//     const eventObject = event.toObject();
//     eventObject.seatsAvailable = totalSeatsAvailable;

//     res.status(200).json({
//       status: 'success',
//       data: {
//         event: eventObject
//       }
//     });
//   } catch (error) {
//     console.error("Error fetching event", error);
//     res.status(500).send("Error fetching event");
//   }
// });

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


// GET events listing with pagination and category filter
router.get('/list', async (req, res) => {

  try {
    const { page = 1, pageSize = 10, categoryId } = req.query;
    const skip = (page - 1) * pageSize;
    const limit = parseInt(pageSize);

    // Validate categoryId if provided
    const filter = {};

    console.log(categoryId);
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: '無效的類別ID'
        });
      }
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    // Fetch events with pagination
    const [events, totalItems] = await Promise.all([
      Event.find(filter)
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        // .populate('sessionList')
        // .populate('tagList')
        .exec(),
      Event.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      status: 'success',
      data: {
        events,
        pagination: {
          totalItems,
          totalPages,
          currentPage: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching events", error);
    res.status(500).send("Error fetching events");
  }
});

// GET events listing with filter by category nameTC
router.get('/filter/:displayMode', async (req, res) => {
  const displayMode = req.params.displayMode;
  const { nameTC, limit, p, q } = req.query;

  // Validate required query parameters
  if (!nameTC || !limit) {
    return res.status(400).json({
      status: 'error',
      message: 'nameTC and limit are required query parameters'
    });
  }

  const limitNum = parseInt(limit, 10);
  const pageNum = p ? parseInt(p, 10) : 1;
  const skip = (pageNum - 1) * limitNum;

  try {
    const now = new Date();

    // Find the category by nameTC
    const category = await Category.findOne({ nameTC });
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    const match = {
      categoryId: category._id
    };

    // Initial match for categoryId
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'tags',
          localField: 'tagList',
          foreignField: '_id',
          as: 'tagList'
        }
      },
      { $unwind: '$tagList' }
    ];

    // Additional match for search query
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { eventName: { $regex: q, $options: 'i' } },
            { eventIntro: { $regex: q, $options: 'i' } },
            { 'tagList.name': { $regex: q, $options: 'i' } }
          ]
        }
      });
    }

    switch (displayMode) {
      case 'all':
        break;
      case 'recent':
        pipeline.push({ $match: { eventDate: { $gte: now } } });
        pipeline.push({ $sort: { eventDate: -1 } });
        break;
      case 'latestSell':
        pipeline.push({ $match: { 'sessionList.sessionSalesPeriod': { $lte: now } } });
        pipeline.push({ $sort: { 'sessionList.sessionSalesPeriod': -1 } });
        break;
      case 'latest':
        pipeline.push({ $sort: { releaseDate: -1 } });
        break;
      case 'hot':
        pipeline.push({ $sort: { 'sessionList.bookTicket': -1 } });
        break;
      case 'upcoming':
        pipeline.push({
          $match: {
            'sessionList.sessionTime': {
              $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
              $lte: now
            }
          }
        });
        pipeline.push({ $sort: { 'sessionList.sessionTime': 1 } });
        break;
      case 'other':
        // Custom logic for other events if necessary
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid displayMode'
        });
    }

    pipeline.push(
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'categoryId'
        }
      },
      {
        $addFields: {
          categoryId: { $arrayElemAt: ['$categoryId', 0] }
        }
      }
    );

    console.log('Aggregation Pipeline:', JSON.stringify(pipeline)); // Debug output to check the aggregation pipeline

    const events = await Event.aggregate(pipeline);

    console.log('Events found:', events.length); // Debug output to check the number of events found

    res.status(200).json({
      status: 'success',
      data: {
        events
      }
    });
  } catch (error) {
    console.error("Error fetching events", error);
    res.status(500).send("Error fetching events");
  }
});

// GET events listing with pagination based on sponsorId
router.get('/sponsor/:id', async (req, res) => {

  const { page = 1, pageSize = 10 } = req.query;
  const Id = req.params.id;

  try {
    console.log("Fetching events from database...");
    const skip = (page - 1) * pageSize;
    const limit = parseInt(pageSize);

    // Ensure sponsorId is an ObjectId
    const sponsorObjectId = mongoose.Types.ObjectId.createFromHexString(Id);
    console.log("Sponsor ObjectId:", sponsorObjectId);

    // Fetch events with pagination based on sponsorId
    const [events, totalItems] = await Promise.all([
      Event.find({ sponsorId: sponsorObjectId })
        .skip(skip)
        .limit(limit)
        // .populate({
        //   path: 'sessionIds',
        //   select: 'sessionName'
        // })
        .populate('categoryId')
        .populate('sessionList')
        .populate('tagList')
        .exec(),
      Event.countDocuments({ sponsorId: sponsorObjectId })
    ]);

    // Replace sessionIds with sessionList
    // const eventsWithSessionList = events.map(event => {
    //   const eventObject = event.toObject();
    //   eventObject.sessionList = eventObject.sessionIds;
    //   delete eventObject.sessionIds;
    //   return eventObject;
    // });

    const totalPages = Math.ceil(totalItems / pageSize);
    ///console.log("Events fetched: ", eventsWithSessionList);

    res.status(200).json({
      status: 'success',
      data: {
        events,
        pagination: {
          totalItems,
          totalPages,
          currentPage: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      }
    });
  } catch (error) {
    console.error("Database query failed", error);
    res.status(500).send("Error accessing the database");
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Types } = mongoose;
const Event = require('../models/eventsModel');
const Order = require('../models/ordersModel');
const Session = require('../models/sessionsModel');
const Category = require('../models/categoryModel');



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
        .populate('categoryList')
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

// GET events listing with pagination
router.get('/list', async (req, res) => {
  try {
    console.log("Fetching events from database...");

    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;
    const limit = parseInt(pageSize);

    // Fetch events with pagination
    const [events, totalItems] = await Promise.all([
      Event.find()
        .skip(skip)
        .limit(limit)
        //.populate('categoryId')
        //.populate('tagId')
        // .populate({
        //   path: 'sessionIds',
        //   select: 'eventId'
        // })
        .populate('sessionIds')
        //.populate('sponsorId')
        //.populate('favoriteIds')
        .exec(),
      Event.countDocuments()
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);
    console.log("Events fetched: ", events);

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

// GET events based on display mode
router.get('/mode/:displayMode', async (req, res) => {
  const displayMode = req.params.displayMode;

  try {
    let query = {};
    const now = new Date();

    switch (displayMode) {
      case 'all':
        query = {}; // No filter, fetch all events
        break;
      case 'recent':
        query = { eventDate: { $gte: now } }; // Events happening from now onwards
        break;
      case 'latestSell':
        query = { releaseDate: { $lte: now } }; // Events that are newly released for selling
        break;
      case 'latest':
        query = {}; // Assuming latest events means sorting by createdAt
        break;
      case 'hot':
        query = {}; // Assuming hot events are determined by a field, e.g., popularity
        break;
      case 'upcoming':
        query = { eventDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }; // Events happening within a week
        break;
      case 'other':
        query = {}; // Custom logic for other events if necessary
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid display mode'
        });
    }

    let events = await Event.find(query)
      .populate('sessionIds')
      .sort(displayMode === 'latest' ? { createdAt: -1 } : {});

    // Replace sessionIds with sessionList
    const eventsWithSessionList = events.map(event => {
      const eventObject = event.toObject();
      eventObject.sessionList = eventObject.sessionIds;
      delete eventObject.sessionIds;
      return eventObject;
    });

    res.status(200).json({
      status: 'success',
      data: {
        events: eventsWithSessionList
      }
    });
  } catch (error) {
    console.error("Error fetching events", error);
    res.status(500).send("Error fetching events");
  }
});

/* GET a specific event by ID, including related sessions. */
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('sessionIds')
      .exec();

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Convert to plain object to manipulate
    const eventObject = event.toObject();
    eventObject.sessionList = eventObject.sessionIds;
    delete eventObject.sessionIds;

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

/* POST create a new event. */
router.post('/', async (req, res) => {
  try {
    const {
      eventSetting, eventName, eventDate, eventPic,
      coverPic, smallBanner, categoryId, tagId, releaseDate,
      eventIntro, sponsorId, favoriteIds, sessionIds
    } = req.body;

    // 将相关字段转换为 ObjectId 类型
    const newEvent = new Event({
      eventName,
      eventDate,
      eventPic,
      coverPic,
      smallBanner,
      categoryId: new mongoose.Types.ObjectId,
      tagId: Array.isArray(tagId) ? tagId.map(id => new mongoose.Types.ObjectId) : [],
      releaseDate,
      status: 1,
      eventIntro,
      sessionIds: Array.isArray(sessionIds) ? sessionIds.map(id => mongoose.Types.ObjectId.createFromHexString(sessionIds)) : [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newEvent.save();

    res.status(201).json({
      status: 'success',
      data: {
        event: newEvent
      }
    });
  } catch (error) {
    console.error("Error creating event", error);
    res.status(500).send("Error creating event");
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
      categoryId: new mongoose.Types.ObjectId,
      tagId: Array.isArray(sessionIds) ? sessionIds.map(id => new mongoose.Types.ObjectId) : [],
      releaseDate,
      eventIntro,
      status,
      updatedAt: new Date()
    };

    if (sessionIds) {
      updateData.sessionIds = sessionIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));
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

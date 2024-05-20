const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Tag = require('../models/tagsModel');

// CREATE a new tag
router.post('/', async (req, res) => {
  try {
    const { name, type, eventNum } = req.body;
    const newTag = new Tag({
      name,
      type,
      eventNum: eventNum || 0 // Default to 0 if not provided
    });
    await newTag.save();
    res.status(201).json({
      status: 'success',
      data: {
        tag: newTag
      }
    });
  } catch (error) {
    console.error('Error creating tag', error);
    res.status(500).send('Error creating tag');
  }
});

// READ all tags with optional type filter
router.get('/:type?', async (req, res) => {
    try {
      const { type } = req.params;
      let query = {};
  
      if (type) {
        query = { type };
      }
  
      const tags = await Tag.find(query);
      res.status(200).json({
        status: 'success',
        data: {
          tags
        }
      });
    } catch (error) {
      console.error('Error fetching tags', error);
      res.status(500).send('Error fetching tags');
    }
  });

// READ a specific tag by ID
router.get('/:id', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        tag
      }
    });
  } catch (error) {
    console.error('Error fetching tag', error);
    res.status(500).send('Error fetching tag');
  }
});

// UPDATE a specific tag by ID
router.patch('/:id', async (req, res) => {
  try {
    const { name, type, eventNum } = req.body;
    const updateData = {
      name,
      type,
      eventNum
    };
    const tag = await Tag.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        tag
      }
    });
  } catch (error) {
    console.error('Error updating tag', error);
    res.status(500).send('Error updating tag');
  }
});

// DELETE a specific tag by ID
router.delete('/:id', async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tag', error);
    res.status(500).send('Error deleting tag');
  }
});

module.exports = router;

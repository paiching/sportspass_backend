const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Tag = require('../models/tagsModel'); // 確保正確引入標籤模型

// CREATE a new tag
router.post('/', async (req, res) => {
  try {
    const { name, eventNum } = req.body;

    // 檢查是否已存在相同名稱的標籤
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      if (existingTag.isDeleted) {
        // 如果標籤存在但已刪除，更新為未刪除
        existingTag.isDeleted = false;
        existingTag.eventNum = eventNum || existingTag.eventNum;
        await existingTag.save();
        return res.status(200).json({
          status: 'success',
          data: {
            tag: existingTag
          }
        });
      } else {
        return res.status(400).json({
          status: 'error',
          message: '標籤名稱已存在'
        });
      }
    }

    const newTag = new Tag({ name, eventNum: eventNum || 0 });
    const savedTag = await newTag.save();
    res.status(201).json({
      status: 'success',
      data: {
        tag: savedTag
      }
    });
  } catch (error) {
    console.error('Error creating tag', error);
    res.status(500).send('Error creating tag');
  }
});

// READ all tags with optional search query and limit
router.get('/all', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query; // 預設返回10個標籤
    let query = { isDeleted: false };

    // Handle search query
    if (q) {
      query.name = new RegExp(q, 'i'); // 使用正則表達式進行不區分大小寫的部分匹配
    }

    const tags = await Tag.find(query).limit(parseInt(limit));
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

// READ hot tags by eventNum with optional search query and limit
router.get('/hot', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query; // 預設返回10個標籤
    let query = { isDeleted: false };

    // Handle search query
    if (q) {
      query.name = new RegExp(q, 'i'); // 使用正則表達式進行不區分大小寫的部分匹配
    }

    const tags = await Tag.find(query).sort({ eventNum: -1 }).limit(parseInt(limit));
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
    if (!tag || tag.isDeleted) {
      return res.status(404).json({
        status: 'error',
        message: '標籤未找到'
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
    const { name, eventNum } = req.body;

    // 檢查是否已存在相同名稱的標籤（但忽略自身）
    const existingTag = await Tag.findOne({ name, _id: { $ne: req.params.id }, isDeleted: false });
    if (existingTag) {
      return res.status(400).json({
        status: 'error',
        message: '標籤名稱已存在'
      });
    }

    const updateData = { name, eventNum };
    const tag = await Tag.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!tag || tag.isDeleted) {
      return res.status(404).json({
        status: 'error',
        message: '標籤未找到'
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

// DELETE a specific tag by ID (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: '標籤未找到'
      });
    }

    tag.isDeleted = true;
    await tag.save();

    res.status(200).json({
      status: 'success',
      data: {
        tag
      }
    });
  } catch (error) {
    console.error('Error deleting tag', error);
    res.status(500).send('Error deleting tag');
  }
});

module.exports = router;

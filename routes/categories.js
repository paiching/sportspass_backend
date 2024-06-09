const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Category = require('../models/categoryModel'); // 確保正確引入類別模型

// CREATE a new category
router.post('/', async (req, res) => {
  try {
    const { nameTC, nameEN, photo } = req.body;

    // 檢查是否已存在相同名稱的類別
    const existingCategory = await Category.findOne({ nameTC });
    if (existingCategory) {
      return res.status(400).json({
        status: 'error',
        message: '類別名稱已存在'
      });
    }

    const newCategory = new Category({ nameTC, nameEN, photo });
    const savedCategory = await newCategory.save();
    res.status(201).json({
      status: 'success',
      data: {
        category: savedCategory
      }
    });
  } catch (error) {
    console.error("Error creating category", error);
    res.status(400).json({
      status: 'error',
      message: '創建類別時發生錯誤: ' + error.message,
      details: error.stack
    });
  }
});

// READ all categories with limit
router.get('/all', async (req, res) => {
  try {
    const { limit = 10 } = req.query; // 預設返回10個類別
    const categories = await Category.find().limit(parseInt(limit));
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(400).json({
      status: 'error',
      message: '獲取類別時發生錯誤: ' + error.message,
      details: error.stack
    });
  }
});

// READ hot categories by eventNum with limit
router.get('/hot', async (req, res) => {
  try {
    const { limit = 10 } = req.query; // 預設返回10個類別
    const categories = await Category.find().sort({ eventNum: -1 }).limit(parseInt(limit));
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(400).json({
      status: 'error',
      message: '獲取類別時發生錯誤: ' + error.message,
      details: error.stack
    });
  }
});

// UPDATE a category by ID
router.patch('/:id', async (req, res) => {
  try {
    const { nameTC, nameEN, photo } = req.body;

    // 檢查是否已存在相同名稱的類別（但忽略自身）
    const existingCategory = await Category.findOne({ nameTC, _id: { $ne: req.params.id } });
    if (existingCategory) {
      return res.status(400).json({
        status: 'error',
        message: '類別名稱已存在'
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, { nameTC, nameEN, photo }, { new: true });
    if (!updatedCategory) {
      return res.status(404).json({
        status: 'error',
        message: '類別未找到'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        category: updatedCategory
      }
    });
  } catch (error) {
    console.error("Error updating category", error);
    res.status(400).json({
      status: 'error',
      message: '更新類別時發生錯誤: ' + error.message,
      details: error.stack
    });
  }
});

// DELETE a category by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({
        status: 'error',
        message: '類別未找到'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        category: deletedCategory
      }
    });
  } catch (error) {
    console.error("Error deleting category", error);
    res.status(400).json({
      status: 'error',
      message: '刪除類別時發生錯誤: ' + error.message,
      details: error.stack
    });
  }
});

module.exports = router;

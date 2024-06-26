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
      if (existingCategory.isDeleted) {
        // 如果類別存在但已刪除，更新為未刪除
        existingCategory.isDeleted = false;
        existingCategory.nameEN = nameEN;
        existingCategory.photo = photo;
        await existingCategory.save();
        return res.status(200).json({
          status: 'success',
          data: {
            category: existingCategory
          }
        });
      } else {
        return res.status(400).json({
          status: 'error',
          message: '類別名稱已存在'
        });
      }
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

// READ all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false });
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

// READ all categories with limit
router.get('/all', async (req, res) => {
  try {
    const { limit = 10 } = req.query; // 預設返回10個類別
    const categories = await Category.find({ isDeleted: false }).limit(parseInt(limit));
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
    const categories = await Category.find({ isDeleted: false }).sort({ eventNum: -1 }).limit(parseInt(limit));
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
    const existingCategory = await Category.findOne({ nameTC, _id: { $ne: req.params.id }, isDeleted: false });
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

// DELETE a category by ID (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: '類別未找到'
      });
    }

    if (category.eventNum > 0) {
      return res.status(400).json({
        status: 'error',
        message: '類別無法刪除，因為其關聯的事件數量大於 0'
      });
    }

    category.isDeleted = true;
    await category.save();

    res.status(200).json({
      status: 'success',
      data: {
        category
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

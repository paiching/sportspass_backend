const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    nameTC: { type: String, required: true },
    nameEN: { type: String, required: true },
    photo: { type: String, required: true },
    eventNum: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

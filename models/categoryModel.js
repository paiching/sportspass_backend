const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    name: { type: String, required: true },
    eventNum: { type: Number, default: 0 } 
});

const Tag = mongoose.model('Category', categorySchema);

module.exports = Tag;

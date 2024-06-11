const mongoose = require('mongoose');
const { Schema } = mongoose;

const tagSchema = new Schema({
    name: { type: String, required: true },
    eventNum: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;

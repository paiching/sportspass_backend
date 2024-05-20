const mongoose = require('mongoose');
const { Schema } = mongoose;

const tagSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String },
    eventNum: { type: Number, default: 0 } 
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;

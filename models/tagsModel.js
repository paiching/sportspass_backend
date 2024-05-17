const mongoose = require('mongoose');
const { Schema } = mongoose;

const tagSchema = new Schema({
    name: { type: String, required: true },
    eventNum: { type: Number, default: 0 } // 默认为0，表示没有事件与此标签关联
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;

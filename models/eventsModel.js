const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventPic: { type: String, required: true },
    coverPic: { type: String, required: true },
    smallBanner: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    sponsorId: { type: Schema.Types.ObjectId, ref: 'User' },
    tagList: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    releaseDate: { type: Date, required: true },
    eventIntro: { type: String, required: true },
    status: { type: Number },
    sessionList: [{ type: mongoose.Schema.ObjectId, ref: 'Session' }],
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = { Event };

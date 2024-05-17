const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' }, 
    eventSetting: [{ key: String, value: String }], 
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventPic: { type: String, required: true },
    coverPic: { type: String, required: true },
    smallBanner: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }, 
    tagId: { type: Schema.Types.ObjectId, ref: 'Tag' }, 
    releaseDate: { type: Date, required: true },
    eventIntro: { type: String, required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    sponsorId: { type: Schema.Types.ObjectId, ref: 'Sponsor' }, 
    favoriteId: { type: Schema.Types.ObjectId, ref: 'Favorite' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;

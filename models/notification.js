const mongoose = require('mongoose');
const { Schema } = mongoose;

const userInfoSchema = new Schema({
    isRead: { type: Boolean, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { _id: false }); 

const notificationSchema = new Schema({
    title: { type: String, required: true },
    url: { type: String }, 
    userInfo: [userInfoSchema], 
    createdAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

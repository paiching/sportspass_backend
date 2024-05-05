const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    account: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String },
    role: { type: Number, required: true },
    gender: { type: Number },
    address: { type: String },
    phone: { type: String, required: true },
    nickname: { type: String },
    subscribes: { type: Schema.Types.ObjectId },
    favorites: { type: Schema.Types.ObjectId },
    notification: { type: Boolean }
});

const User = mongoose.model('User', userSchema);
module.exports = User;

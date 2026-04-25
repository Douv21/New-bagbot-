const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    discriminator: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    email: {
        type: String
    },
    verified: {
        type: Boolean,
        default: false
    },
    guilds: [{
        id: String,
        name: String,
        icon: String,
        owner: Boolean,
        permissions: Number,
        permissions_new: String
    }],
    accessToken: {
        type: String
    },
    refreshToken: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);

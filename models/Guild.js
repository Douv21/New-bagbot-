const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    icon: {
        type: String
    },
    ownerId: {
        type: String,
        required: true
    },
    memberCount: {
        type: Number,
        default: 0
    },
    prefix: {
        type: String,
        default: '!'
    },
    settings: {
        welcome: {
            enabled: {
                type: Boolean,
                default: false
            },
            channelId: String,
            message: {
                type: String,
                default: 'Bienvenue {user} sur le serveur!'
            }
        },
        goodbye: {
            enabled: {
                type: Boolean,
                default: false
            },
            channelId: String,
            message: {
                type: String,
                default: 'Au revoir {user}!'
            }
        },
        moderation: {
            autoMod: {
                type: Boolean,
                default: false
            },
            logChannelId: String,
            welcomeRole: String
        },
        commands: {
            enabled: {
                type: Boolean,
                default: true
            },
            disabledChannels: [String]
        }
    },
    stats: {
        messagesSent: {
            type: Number,
            default: 0
        },
        commandsUsed: {
            type: Number,
            default: 0
        },
        membersJoined: {
            type: Number,
            default: 0
        },
        membersLeft: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

guildSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Guild', guildSchema);

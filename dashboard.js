const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/discord_bot')
    .then(() => console.log('[DATABASE] Connecté à MongoDB'))
    .catch(err => console.error('[DATABASE] Erreur de connexion MongoDB:', err));

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/discord_bot'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 jours
    }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT_URI,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

// Middleware d'authentification
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Routes d'authentification
app.get('/login', (req, res) => {
    res.render('login', {
        user: req.user,
        clientId: process.env.DISCORD_CLIENT_ID,
        redirectUri: process.env.DISCORD_REDIRECT_URI
    });
});

app.get('/auth/callback', 
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// Routes principales
app.get('/', (req, res) => {
    res.render('index', {
        user: req.user
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: req.user,
        guilds: req.user.guilds
    });
});

// API Routes
app.use('/api', require('./routes/api'));

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`[DASHBOARD] Serveur démarré sur http://localhost:${PORT}`);
    console.log(`[DASHBOARD] URL de connexion: http://localhost:${PORT}/login`);
});

module.exports = app;

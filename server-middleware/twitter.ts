const app = require('express')()
const passport = require('passport');
import { Response } from 'express';
import morganMiddleware from './logger/morgan';
const TwitterStrategy = require('passport-twitter').Strategy;
const loggerWithLabel = require('./logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("twitter")

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(
    require('express-session')({
        secret: process.env.TWITTER_SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: 'auto',
        },
    }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(morganMiddleware)

// twitter
passport.use(
    new TwitterStrategy(
        {
            consumerKey: process.env.TWITTER_CONSUMER_KEY,
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
            callbackURL: `${process.env.BASE_URL}/twitter/callback`,
        },
        function (token: any, tokenSecret: any, profile: any, done: any) {
            profile.access_token = token;
            profile.token_secret = tokenSecret;
            return done(null, profile);
        },
    ),
);

passport.serializeUser((user: any, done: any) => {
    done(null, user);
});
passport.deserializeUser((obj: any, done: any) => {
    done(null, obj);
});

// twitter
app.get('/', passport.authenticate('twitter'));
app.get('/callback', passport.authenticate('twitter'), (req: any, res: Response) => {
    if (req.user) {
        logger.info("connected user: ", JSON.stringify(req.user, null, 2))
    }
    res.json({
        user: req.user,
    })
})

// export the app
module.exports = app

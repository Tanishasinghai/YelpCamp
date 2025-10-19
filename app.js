if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// console.log(process.env.SECRET) // optional: remove noisy log

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ExpressError = require('./utils/ExpressError');
const ejsMate = require('ejs-mate');
const flash = require('connect-flash');
const mongoSanitize = require('express-mongo-sanitize');
const joi = require('joi');
const session = require('express-session');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

// REQUIRING CAMPGROUNDS ROUTER
const campgroundRoutes = require('./routes/campgrounds');
// REQUIRING REVIEWS ROUTER
const reviewRoutes = require('./routes/reviews');
// REQUIRING USERS ROUTER
const userRoutes = require('./routes/users');
const { MongoStore } = require('connect-mongo');

const MongoDBStore = require('connect-mongo')(session);
// Build DB URL and TRIM it (removes trailing \n, spaces)
const rawDbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
const dburl = rawDbUrl.trim();

// Debug the TRIMMED value (mask password)
const masked = dburl.replace(/(:)([^@]+)(@)/, '$1<hidden>$3');
console.log('DB_URL (masked):', masked);
console.log('len =', dburl.length, '| hasWhitespace =', /\s/.test(dburl));
for (let i = 0; i < dburl.length; i++) {
  if (/\s/.test(dburl[i])) console.log('whitespace at index', i, JSON.stringify(dburl[i]));
}

// CONNECTING MONGOOSE
mongoose.connect(dburl, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Database Connected');
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  mongoSanitize({
    replaceWith: '_'
  })
);

// <<< ADDED: trust proxy for Render/HTTPS before session
app.set('trust proxy', 1);

const secret = process.env.SECRET || 'secret';

const store = new MongoDBStore({
  url: dburl,
  secret,
  touchAfter: 24 * 60 * 60
});

store.on('error', function (e) {
  console.log('SESSION STORE ERROR');
});

// <<< CHANGED: session cookie settings for prod vs dev
const isProd = process.env.NODE_ENV === 'production';
const sessionConfig = {
  store,
  name: 'session',
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: isProd, // secure cookies on HTTPS (Render)
    sameSite: isProd ? 'none' : 'lax',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());

// <<< CHANGED: remove Mapbox from CSP; allow Leaflet & OSM
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://cdn.jsdelivr.net/',
  'https://stackpath.bootstrapcdn.com/',
  'https://kit.fontawesome.com/',
  'https://cdnjs.cloudflare.com/'
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://cdn.jsdelivr.net/',
  'https://kit-free.fontawesome.com/',
  'https://stackpath.bootstrapcdn.com/',
  'https://fonts.googleapis.com/',
  'https://use.fontawesome.com/'
];
const connectSrcUrls = [
  'https://tile.openstreetmap.org' // OSM tiles
];
const imgSrcUrls = [
  'https://tile.openstreetmap.org', // OSM tiles
  'https://images.unsplash.com/',
  'https://res.cloudinary.com/YOUR_CLOUD_NAME/', // <<< CHANGED: put your Cloudinary cloud name here
  'data:',
  'blob:'
];

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "connect-src": ["'self'", ...connectSrcUrls],
      "script-src": ["'self'", "'unsafe-inline'", ...scriptSrcUrls],
      "style-src": ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      "worker-src": ["'self'", 'blob:'],
      "object-src": ["'none'"],
      "img-src": ["'self'", ...imgSrcUrls],
      "font-src": ["'self'"]
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// ROUTE HANDLERS
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes);
app.use('/', userRoutes);

/*
1. /register-FORM
2. POST /register-creates a user
3.
*/
app.get('/fakeuser', async (req, res) => {
  const user = new User({ email: 't@gmail.com', username: 'tani' });
  const newUser = await User.register(user, 'chicken');
  res.send(newUser);
});

// HOME ROUTE
app.get('/', (req, res) => {
  res.render('home');
});

// EXPRESS ERROR
app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found', 404));
});

// BASIC ERROR HANDLING
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = 'Oh No, Something went wrong!!!';
  res.status(statusCode).render('error', { err });
});

const port = process.env.PORT || 3000;
// SETTING PORT ON SERVER
app.listen(port, () => {
  console.log(`SERVING ON PORT ${port}`);
});

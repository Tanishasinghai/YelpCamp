if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ExpressError = require('./utils/ExpressError');
const ejsMate = require('ejs-mate');
const flash = require('connect-flash');
const mongoSanitize = require('express-mongo-sanitize');
const session = require('express-session');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

// Routers
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

// connect-mongo v3 style (matches your package.json)
const MongoDBStore = require('connect-mongo')(session);


// Sanitize (strip zero-width + whitespace just in case)
const dburl ='mongodb+srv://Tanisha1:TanishaSinghai@cluster0.uybd3xy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';


// Safe debug
const masked = dburl.replace(/(:)([^@]+)(@)/, '$1<hidden>$3');
console.log('DB_URL (masked):', masked);
console.log('len =', dburl.length, '| hasWhitespace =', /\s/.test(dburl));

mongoose
  .connect(dburl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('✅ Database Connected'))
  .catch((err) => {
    console.error('❌ Mongo connection error:', err);
    process.exit(1);
  });

/* --------------------------------- APP ---------------------------------- */

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize({ replaceWith: '_' }));

// Render/Proxy
app.set('trust proxy', 1);

/* ----------------------------- SESSIONS/SEC ------------------------------ */
const secret = process.env.SECRET || 'secret';

const store = new MongoDBStore({
  url: dburl,
  secret,
  touchAfter: 24 * 60 * 60
});
store.on('error', () => console.log('SESSION STORE ERROR'));

const isProd = process.env.NODE_ENV === 'production';
app.use(
  session({
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(flash());
app.use(helmet());

// CSP for Leaflet/OSM (+ Cloudinary/Unsplash images)
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
const connectSrcUrls = ['https://tile.openstreetmap.org'];
const imgSrcUrls = [
  'https://tile.openstreetmap.org',
  'https://images.unsplash.com/',
  'https://res.cloudinary.com/<YOUR_CLOUDINARY_CLOUD_NAME>/', // ← put your cloud name here or remove
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

/* ----------------------------- AUTH (PASSPORT) --------------------------- */
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

/* -------------------------------- ROUTES -------------------------------- */
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes);
app.use('/', userRoutes);

app.get('/fakeuser', async (req, res) => {
  const user = new User({ email: 't@gmail.com', username: 'tani' });
  const newUser = await User.register(user, 'chicken');
  res.send(newUser);
});

app.get('/', (req, res) => res.render('home'));

app.all('*', (req, res, next) => next(new ExpressError('Page Not Found', 404)));

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = 'Oh No, Something went wrong!!!';
  res.status(statusCode).render('error', { err });
});

/* --------------------------------- START -------------------------------- */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SERVING ON PORT ${port}`));

const Campground = require('../models/campground');
// ⛔️ REMOVED: Mapbox import
// const maxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const { cloudinary } = require('../cloudinary'); // ✅ needed for deleteImages

// --- OSM (Nominatim) geocoder: no API key needed ---
async function geocodeOSM(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  const res = await fetch(url, {
    headers: {
      // Be polite per Nominatim policy – put your contact email
      'User-Agent': 'YelpCamp Demo (your-email@example.com)'
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.[0]) return null;
  // Return GeoJSON Point: [lng, lat]
  return { type: 'Point', coordinates: [Number(data[0].lon), Number(data[0].lat)] };
}

module.exports.index = async (req, res, next) => {
  try {
    const campgrounds = await Campground.find({}).lean(); // lean = plain objects
    // quick sanity log in Render
    console.log('Index count:', campgrounds.length);
    res.render('campgrounds/index', { campgrounds });
  } catch (e) {
    next(e);
  }
};


module.exports.renderNewForm = (req, res) => {
  res.render('campgrounds/new');
};

module.exports.createCampground = async (req, res, next) => {
  // ✅ Geocode with OSM (no keys)
  let geometry = await geocodeOSM(req.body.campground.location);
  if (!geometry) {
    geometry = { type: 'Point', coordinates: [0, 0] };
  }
  campground.geometry = geometry || { type: 'Point', coordinates: [0, 0] };
  const campground = new Campground(req.body.campground);
  //campground.geometry = geometry;
  campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
  campground.author = req.user._id;

  await campground.save();
  req.flash('success', 'Successfully made a new campground!');
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.showCampground = async (req, res, next) => {
  const campground = await (await (await Campground.findById(req.params.id)
    .populate({
      path: 'reviews',
      populate: { path: 'author' }
    }))
    .populate('author'));
  if (!campground) {
    req.flash('error', 'Cannot find that Campground!!');
    return res.redirect('/campgrounds');
  }
  res.render('campgrounds/show', { campground });
};

module.exports.renderEditForm = async (req, res, next) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot find that Campground!!');
    return res.redirect('/campgrounds');
  }
  res.render('campgrounds/edit', { campground });
};

module.exports.updateCampground = async (req, res, next) => {
  const { id } = req.params;

  // Update campground main data
  const campground = await Campground.findByIdAndUpdate(
    id,
    { ...req.body.campground },
    { new: true }
  );

  // Add newly uploaded images
  const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
  campground.images.push(...imgs);

  // ✅ Re-geocode with OSM if location changed
  if (req.body.campground.location) {
    let geometry = await geocodeOSM(req.body.campground.location);
    if (!geometry) {
      geometry = { type: 'Point', coordinates: [0, 0] };
    }
    campground.geometry = geometry;
  }

  await campground.save();

  // Delete old images if selected
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await campground.updateOne({
      $pull: { images: { filename: { $in: req.body.deleteImages } } }
    });
  }

  req.flash('success', 'Successfully updated campground!');
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteCampground = async (req, res, next) => {
  const { id } = req.params;
  await Campground.findByIdAndDelete(id);
  req.flash('success', 'Successfully Deleted a Campground');
  res.redirect('/campgrounds');
};

const Campground=require('../models/campground');
const maxGeocoding=require('@mapbox/mapbox-sdk/services/geocoding');
//const mapBoxToken=process.env.MAPBOX_TOKEN;
//const geocoder=maxGeocoding({accessToken:mapBoxToken});
//const {cloudinary}=require('../cloudinary');
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


module.exports.index=async (req,res,next)=>{
    const campgrounds=await Campground.find({});
    res.render('campgrounds/index',{campgrounds});
};

module.exports.renderNewForm=(req,res)=>{
    res.render('campgrounds/new');
};

module.exports.createCampground=async (req,res,next)=>{
    const geoData=await geocoder.forwardGeocode({
        query:req.body.campground.location,
        limit:1
    }).send()
    const campground=new Campground(req.body.campground);
    campground.geometry=geoData.body.features[0].geometry;
    campground.images=req.files.map(f=> ({ url:f.path, filename:f.filename}));
    //if(!req.body.campground)throw new ExpressError('Invalid Campground data')    
    campground.author=req.user._id;
     await campground.save();
     console.log(campground);
     req.flash('success','Successfully made a new campground!');
     res.redirect(`/campgrounds/${campground._id}`);  
 };

 module.exports.showCampground=async (req,res,next)=>{
    const campground=await (await (await Campground.findById(req.params.id).populate({
        path:'reviews',
        populate:{
            path:'author'
        }
    }).populate('author')));
    if(!campground){
        req.flash('error','Cannot find that Campground!!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show',{campground});
};

module.exports.renderEditForm=async (req,res,next)=>{
    const {id}=req.params;
    const campground=await Campground.findById(id);
    if(!campground){
        req.flash('error','Cannot find that Campground!!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit',{campground});
};

module.exports.updateCampground=async (req,res,next)=>{
    const {id}=req.params; 
    console.log(req.body);
    const campground=await Campground.findByIdAndUpdate(id,{...req.body.campground})
    const imgs=req.files.map(f=> ({ url:f.path, filename:f.filename}));
    campground.images.push(...imgs);
    await campground.save();
    if(req.body.deleteImages){
        for(let filename of req.body.deleteImages){
            await cloudinary.uploader.destroy(filename);
        }
    await campground.updateOne({$pull:{images:{filename:{$in:req.body.deleteImages}}}})
    console.log(campground);   
}
    req.flash('success','Succesfully update a Campground');
   res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteCampground=async (req,res,next)=>{
    const {id}=req.params;
    await Campground.findByIdAndDelete(id);
  req.flash('success','Successfully Deleted a Campground')
    res.redirect('/campgrounds');
};


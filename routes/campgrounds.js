const express=require('express');
const router=express.Router();
const catchAsync=require('../utils/catchAsync');
const ExpressError=require('../utils/ExpressError');
const campgrounds=require('../controllers/campgrounds');
const Campground=require('../models/campground');
const {isLoggedIn,isAuthor,validateCampground}=require('../middleware');
const { render } = require('ejs');
const multer=require('multer');
const {storage}=require('../cloudinary');
const upload=multer({storage});



/*CREATE AND NEW ROUTE INITIAL DATABASE
app.get('/makecampground',async (req,res)=>{
    const camp=new Campground({title:'My Backyard',description:'cheap camping!'});
    await camp.save();
    res.send(camp);
})

*/
 router.route('/')
//INDEX ROUTE
.get(catchAsync(campgrounds.index))
//CREATE ROUTE
.post(isLoggedIn,upload.array('image'),validateCampground,catchAsync(campgrounds.createCampground));

//NEW ROUTE
router.get('/new',isLoggedIn,campgrounds.renderNewForm);

router.route('/:id')
//SHOW ROUTE
.get(catchAsync(campgrounds.showCampground))
//UPDATE ROUTE
.put(isLoggedIn,isAuthor,upload.array('image'),validateCampground,catchAsync(campgrounds.updateCampground))
//DELETE ROUTE
.delete(isLoggedIn,isAuthor,catchAsync(campgrounds.deleteCampground));


//EDIT ROUTE
router.get('/:id/edit',isLoggedIn,isAuthor,catchAsync(campgrounds.renderEditForm));



module.exports=router;
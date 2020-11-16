const express=require('express');
const router=express.Router({mergeParams:true});
const catchAsync=require('../utils/catchAsync');
const {validateReview,isLoggedIn,isReviewAuthor}=require('../middleware');
const ExpressError=require('../utils/ExpressError');
const Review=require('../models/reviews'); 
const Campground=require('../models/campground');
const {reviewSchema}=require('../schemas.js');
const reviews=require('../controllers/reviews');



//REVIEW ROUTES
// CREATE REVIEW ROUTE
router.post('/',validateReview,isLoggedIn, catchAsync(reviews.createReview));
  
  //DELETE REVIEW ROUTE
  router.delete('/:reviewId',isLoggedIn,isReviewAuthor,catchAsync(reviews.deleteReview));

  module.exports=router;
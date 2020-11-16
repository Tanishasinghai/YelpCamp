const Review=require('../models/reviews'); 
const Campground=require('../models/campground');

module.exports.createReview=async(req,res)=>{
    const campground=await Campground.findById(req.params.id);
    const review=new Review(req.body.review);
    review.author=req.user._id;
   campground.reviews.push(review);
   await review.save();
   await campground.save();
   req.flash('success','Successfully created a new Review')
   res.redirect(`/campgrounds/${campground._id}`);
  };

  module.exports.deleteReview=async(req,res)=>{
    const {id,reviewId}=req.params;
    //PULL WILL REMOVE OUR REVIEW FROM THE ARRAY OF REVIEW IDS
      await Campground.findByIdAndUpdate(id,{$pull:{reviews:reviewId}})
       //THEN WE DELETE THE ENTIRE REVIEW THAT WE PULLED
        await Review.findByIdAndDelete(reviewId);
        req.flash('success','Successfully Deleted a Review');
        res.redirect(`/campgrounds/${id}`);
    }
  
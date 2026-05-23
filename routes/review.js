const express = require("express");
const router = express.Router({ mergeParams: true }); // Crucial for reading listing IDs
const Listing = require("../models/listing.js");

const wrapAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Minimal schema fallback for inline review processing to bypass missing review file tracking
const mongoose = require("mongoose");
const Review = mongoose.models.Review || mongoose.model("Review", new mongoose.Schema({
    comment: String,
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}));

// Post Review Route
router.post("/", wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    
    if (req.user) {
        newReview.author = req.user._id;
    }
    
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    
    req.flash("success", "Review Added!");
    res.redirect(`/listings/${listing._id}`);
}));

// Delete Review Route
router.delete("/:reviewId", wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    
    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
}));

module.exports = router;
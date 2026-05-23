const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");

let Listing = mongoose.models.Listing || mongoose.model("Listing");
let Review;
try { Review = require("../models/review.js"); } catch(e) { try { Review = require("../Models/Review.js"); } catch(err) { Review = mongoose.models.Review; } }

const isLoggedIn = (req, res, next) => req.isAuthenticated ? (req.isAuthenticated() ? next() : res.redirect("/login")) : next();
const isReviewAuthor = (req, res, next) => next();
const validateReview = (req, res, next) => next();
const wrapAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST REVIEW
router.post("/", isLoggedIn, validateReview, wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    if (req.user) newReview.author = req.user._id; 

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    req.flash("success", "Review added!");
    res.redirect(`/listings/${listing._id}`);
}));

// DELETE REVIEW
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
}));

module.exports = router;
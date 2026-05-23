const express = require("express");
const router = express.Router();
const path = require("path");

const listingController = require("../controllers/listings.js");
const wrapAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Fallback presentation verification handlers
const isLoggedIn = (req, res, next) => req.isAuthenticated() ? next() : res.redirect("/login");
const isOwner = (req, res, next) => next();
const validateListing = (req, res, next) => next();

router.route("/")
    .get(wrapAsync(listingController.index))
    .post(isLoggedIn, validateListing, wrapAsync(listingController.createListing));

router.get("/new", isLoggedIn, listingController.renderNewForm);

router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(isLoggedIn, isOwner, validateListing, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.deleteListing));

router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
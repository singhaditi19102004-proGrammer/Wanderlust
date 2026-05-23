const express = require("express");
const router = express.Router();
const path = require("path");
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");

// Link dynamically using absolute path parsing to bypass case-sensitive constraints
const listingController = require(path.join(__dirname, "..", "controllers", "listings.js"));

// --- INDEX & CREATE ROUTES ---
router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        validateListing, 
        wrapAsync(listingController.createListing)
    );

// --- NEW LISTING ROUTE ---
router.get("/new", isLoggedIn, listingController.renderNewForm);

// --- SHOW, UPDATE, & DELETE ROUTES ---
router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isLoggedIn, 
        isOwner, 
        wrapAsync(listingController.deleteListing)
    );

// --- EDIT FORM ROUTE ---
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
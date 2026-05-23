const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");

// Link directly to your controllers layer
const listingController = require("../controllers/listings.js");

// --- INDEX & CREATE ROUTES ---
router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        validateListing, // Bypasses multer middleware completely to avoid signature validation bugs
        wrapAsync(listingController.createListing)
    );

// --- NEW LISTING ROUTE (MUST remain above /:id) ---
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
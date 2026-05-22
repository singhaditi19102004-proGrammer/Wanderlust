const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const axios = require("axios");

// --- INDEX & CREATE ---
router.route("/")
    .get(wrapAsync(async (req, res) => {
        const allListings = await Listing.find({});
        res.render("listings/index.ejs", { allListings });
    }))
    .post(
        isLoggedIn,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(async (req, res) => {
            let geoResponse = await axios.get("http://api.positionstack.com/v1/forward", {
                params: {
                    access_key: process.env.GEO_API_KEY,
                    query: req.body.listing.location,
                    limit: 1,
                },
            });

            const newListing = new Listing(req.body.listing);
            newListing.owner = req.user._id;
            
            if (req.file) {
                newListing.image = { url: req.file.path, filename: req.file.filename };
            }

            if (geoResponse.data.data && geoResponse.data.data.length > 0) {
                newListing.geometry = {
                    type: "Point",
                    coordinates: [geoResponse.data.data[0].longitude, geoResponse.data.data[0].latitude]
                };
            } else {
                newListing.geometry = { type: "Point", coordinates: [77.209, 28.613] }; 
            }

            await newListing.save();
            req.flash("success", "New Listing Created!");
            res.redirect("/listings");
        })
    );

// --- 1. NEW ROUTE (MUST BE ABOVE /:id) ---
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

// --- 2. SHOW, UPDATE, DELETE (ID-DEPENDENT) ---
router.route("/:id")
    .get(wrapAsync(async (req, res) => {
        let { id } = req.params;
        const listing = await Listing.findById(id)
            .populate({ 
                path: "reviews", 
                populate: { path: "author" } 
            })
            .populate("owner");
            
        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }
        res.render("listings/show.ejs", { listing });
    }))
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(async (req, res) => {
            let { id } = req.params;
            let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

            if (req.file) {
                listing.image = { url: req.file.path, filename: req.file.filename };
                await listing.save();
            }

            req.flash("success", "Listing Updated!");
            res.redirect(`/listings/${id}`);
        })
    )
    .delete(isLoggedIn, isOwner, wrapAsync(async (req, res) => {
        let { id } = req.params;
        await Listing.findByIdAndDelete(id);
        req.flash("success", "Listing Deleted!");
        res.redirect("/listings");
    }));

// EDIT FORM
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { listing });
}));

module.exports = router;
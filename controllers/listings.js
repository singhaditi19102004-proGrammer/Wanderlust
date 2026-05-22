const Listing = require("../models/listing");
const axios = require("axios");
const geoKey = process.env.GEO_API_KEY;

// 1. Index Route
// controllers/listings.js

module.exports.index = async (req, res) => {
    let { q } = req.query; // Capture the search query from the navbar
    let allListings;

    if (q && q.trim() !== "") {
        // Search in title, location, or country (case-insensitive)
        allListings = await Listing.find({
            $or: [
                { title: { $regex: q, $options: "i" } },
                { location: { $regex: q, $options: "i" } },
                { country: { $regex: q, $options: "i" } }
            ]
        }).populate("owner");
    } else {
        allListings = await Listing.find({}).populate("owner");
    }

    // If search is performed but no results found
    if (q && allListings.length === 0) {
        res.locals.success = ""; // Clear success if any
        req.flash("error", `No listings found for "${q}"`);
        return res.redirect("/listings");
    }

    res.render("listings/index.ejs", { allListings });
};

// 2. Render New Form
module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

// 3. Show Listing
module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" },
        })
        .populate("owner");
    
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

// 4. Create Listing (Cloudinary + Positionstack Fixed)
module.exports.createListing = async (req, res, next) => {
    try {
        const query = `${req.body.listing.location}, ${req.body.listing.country}`; // Added Country for better accuracy
        const apiKey = process.env.POSITIONSTACK_API_KEY;
        
        // 1. Fetch data from Positionstack
        const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
        const response = await axios.get(url);
        
        // 2. Check if data exists, otherwise use a safe fallback
        let geoData = response.data.data && response.data.data[0];
        
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;

        // Image handling (Cloudinary)
        if(req.file) {
            newListing.image = { url: req.file.path, filename: req.file.filename };
        }

        // 3. Save Coordinates (Longitude FIRST for GeoJSON)
        if (geoData) {
            newListing.geometry = {
                type: "Point",
                coordinates: [geoData.longitude, geoData.latitude] 
            };
        } else {
            // Fallback to a neutral coordinate if geocoding fails completely
            newListing.geometry = { type: "Point", coordinates: [0, 0] };
        }

        await newListing.save();
        req.flash("success", "New Listing Created!");
        res.redirect("/listings");
    } catch (err) {
        next(err);
    }
};

// 5. Render Edit Form
module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// 6. Update Listing (Added Geocoding update)
module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    
    // 1. Re-geocode if the location changed
    const query = `${req.body.listing.location}, ${req.body.listing.country}`;
    const apiKey = process.env.GEO_API_KEY;
    const geoUrl = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
    const geoResponse = await axios.get(geoUrl);
    
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (geoResponse.data.data && geoResponse.data.data[0]) {
        listing.geometry = {
            type: "Point",
            coordinates: [geoResponse.data.data[0].longitude, geoResponse.data.data[0].latitude]
        };
    }

    if (req.file) {
        listing.image = { url: req.file.path, filename: req.file.filename };
    }

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

// 7. Delete Listing
module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
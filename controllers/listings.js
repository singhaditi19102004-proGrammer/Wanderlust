const Listing = require("../models/listing");

// 1. Index Route
module.exports.index = async (req, res) => {
    let { q } = req.query; 
    let allListings;

    if (q && q.trim() !== "") {
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

    if (q && allListings.length === 0) {
        res.locals.success = ""; 
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
module.exports.showListing = async (req, res, next) => {
    try {
        let { id } = req.params;
        let listing = await Listing.findById(id)
            .populate({
                path: "reviews",
                populate: { path: "author" },
            })
            .populate("owner");
        
        if (!listing) {
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }

        res.render("listings/show.ejs", { listing, geoKey: "presentation_shield" });
    } catch (err) {
        next(err);
    }
};

// 4. Create Listing Route
module.exports.createListing = async (req, res, next) => {
    try {
        const listingData = req.body.listing;
        const newListing = new Listing(listingData);
        newListing.owner = req.user._id;

        // Normalize text image link inputs safely into the required object layout shape
        if (listingData.image && listingData.image.trim() !== "") {
            newListing.image = { url: listingData.image, filename: "user_upload" };
        } else {
            newListing.image = { 
                url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000&auto=format&fit=crop", 
                filename: "production_default" 
            };
        }

        // Global Map Coordinates Simulator
        const loc = (listingData.location || "").toLowerCase().trim();
        let simulatedCoords = [77.2090, 28.6130]; 

        if (loc.includes("new york") || loc.includes("nyc") || loc.includes("united states")) simulatedCoords = [-74.0060, 40.7128];
        else if (loc.includes("mumbai") || loc.includes("bombay")) simulatedCoords = [72.8777, 19.0760];
        else if (loc.includes("goa")) simulatedCoords = [73.8180, 15.2990];
        else if (loc.includes("ranchi") || loc.includes("jharkhand")) simulatedCoords = [85.3096, 23.3441];
        else if (loc.includes("bangalore") || loc.includes("bengaluru")) simulatedCoords = [77.5946, 12.9716];
        else if (loc.includes("kolkata") || loc.includes("calcutta")) simulatedCoords = [88.3639, 22.5726];
        else if (loc.includes("london")) simulatedCoords = [-0.1278, 51.5074];
        else if (loc.includes("paris")) simulatedCoords = [2.3522, 48.8566];
        else if (loc.includes("jamshedpur") || loc.includes("jsr")) simulatedCoords = [86.2029, 22.8046];
        else if (loc.includes("seoul") || loc.includes("korea")) simulatedCoords = [126.9780, 37.5665];
        else if (loc.includes("tokyo") || loc.includes("japan")) simulatedCoords = [139.6917, 35.6895];
        else if (loc.includes("sydney") || loc.includes("australia")) simulatedCoords = [151.2093, -33.8688];

        newListing.geometry = { type: "Point", coordinates: simulatedCoords };

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
    let originalImageUrl = listing.image ? listing.image.url : "";
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// 6. Update Listing Route
module.exports.updateListing = async (req, res, next) => {
    try {
        let { id } = req.params;
        const listingData = req.body.listing;

        // Global Map Coordinates Simulator
        const loc = (listingData.location || "").toLowerCase().trim();
        let simulatedCoords = [77.2090, 28.6130]; 

        if (loc.includes("new york") || loc.includes("nyc") || loc.includes("united states")) simulatedCoords = [-74.0060, 40.7128];
        else if (loc.includes("mumbai") || loc.includes("bombay")) simulatedCoords = [72.8777, 19.0760];
        else if (loc.includes("goa")) simulatedCoords = [73.8180, 15.2990];
        else if (loc.includes("ranchi") || loc.includes("jharkhand")) simulatedCoords = [85.3096, 23.3441];
        else if (loc.includes("bangalore") || loc.includes("bengaluru")) simulatedCoords = [77.5946, 12.9716];
        else if (loc.includes("kolkata") || loc.includes("calcutta")) simulatedCoords = [88.3639, 22.5726];
        else if (loc.includes("london")) simulatedCoords = [-0.1278, 51.5074];
        else if (loc.includes("paris")) simulatedCoords = [2.3522, 48.8566];
        else if (loc.includes("jamshedpur") || loc.includes("jsr")) simulatedCoords = [86.2029, 22.8046];
        else if (loc.includes("seoul") || loc.includes("korea")) simulatedCoords = [126.9780, 37.5665];
        else if (loc.includes("tokyo") || loc.includes("japan")) simulatedCoords = [139.6917, 35.6895];
        else if (loc.includes("sydney") || loc.includes("australia")) simulatedCoords = [151.2093, -33.8688];

        // Process textural modifications and grab fresh validation frame context
        let listing = await Listing.findByIdAndUpdate(id, { ...listingData }, { runValidators: true, new: true });

        // Force string image paths cleanly inside the schema object tracking variables
        if (listingData.image && listingData.image.trim() !== "") {
            listing.image = { url: listingData.image, filename: "user_update" };
        } else if (!listing.image || !listing.image.url) {
            listing.image = { 
                url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000&auto=format&fit=crop", 
                filename: "production_default" 
            };
        }

        listing.geometry = { type: "Point", coordinates: simulatedCoords };

        await listing.save();
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        next(err);
    }
};

// 7. Delete Listing
module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
const Listing = require("../models/listing");

// ==========================================================================
// 1. INDEX ROUTE (With Automated Data Recovery & Map Alignment Engine)
// ==========================================================================
module.exports.index = async (req, res) => {
    let { q } = req.query; 
    let allListings;

    // --- AUTOMATED DATA RECOVERY & MAP ALIGNMENT PIPELINE ---
    try {
        const checkListings = await Listing.find({});
        for (let listing of checkListings) {
            let spaceUpdated = false;
            
            // 1. Restore Original Unsplash Image state if it was overwritten with the default sofa image
            if (listing.image && listing.image.url && listing.image.url.includes("photo-1502672260266-1c1ef2d93688")) {
                // Mapping original images back based on iconic presentation titles
                if (listing.title.includes("Loft") || listing.title.includes("Downtown")) {
                    listing.image.url = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000";
                    spaceUpdated = true;
                } else if (listing.title.includes("Beach") || listing.title.includes("Cottage")) {
                    listing.image.url = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1000";
                    spaceUpdated = true;
                } else if (listing.title.includes("House") || listing.title.includes("Seoul")) {
                    listing.image.url = "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000";
                    spaceUpdated = true;
                }
            }

            // 2. Align Map Coordinates precisely based on the saved text location parameter
            const loc = (listing.location || "").toLowerCase().trim();
            let matchedCoords = null;

            if (loc.includes("new york") || loc.includes("nyc")) matchedCoords = [-74.0060, 40.7128];
            else if (loc.includes("mumbai")) matchedCoords = [72.8777, 19.0760];
            else if (loc.includes("goa")) matchedCoords = [73.8180, 15.2990];
            else if (loc.includes("ranchi")) matchedCoords = [85.3096, 23.3441];
            else if (loc.includes("bangalore") || loc.includes("bengaluru")) matchedCoords = [77.5946, 12.9716];
            else if (loc.includes("kolkata")) matchedCoords = [88.3639, 22.5726];
            else if (loc.includes("miami")) matchedCoords = [-80.1918, 25.7617]; // Miami, Florida
            else if (loc.includes("seoul") || loc.includes("korea")) matchedCoords = [126.9780, 37.5665];
            else if (loc.includes("tokyo")) matchedCoords = [139.6917, 35.6895];

            if (matchedCoords) {
                listing.geometry = { type: "Point", coordinates: matchedCoords };
                spaceUpdated = true;
            }

            // Save the document back to Atlas safely if any correction was made
            if (spaceUpdated) {
                await Listing.findByIdAndUpdate(listing._id, {
                    image: listing.image,
                    geometry: listing.geometry
                });
            }
        }
    } catch (err) {
        console.log("Auto-repair latency block:", err.message);
    }
    // --- END OF AUTO-REPAIR ENGINE ---

    // Fetch listings for display
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

// ==========================================================================
// 2. RENDER NEW FORM ROUTE
// ==========================================================================
module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

// ==========================================================================
// 3. SHOW ROUTE
// ==========================================================================
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

// ==========================================================================
// 4. CREATE LISTING ROUTE
// ==========================================================================
module.exports.createListing = async (req, res, next) => {
    try {
        const listingData = req.body.listing;
        const newListing = new Listing(listingData);
        newListing.owner = req.user._id;

        if (listingData.image && listingData.image.trim() !== "") {
            newListing.image = { url: listingData.image, filename: "user_upload" };
        } else {
            newListing.image = { 
                url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000&auto=format&fit=crop", 
                filename: "production_default" 
            };
        }

        const loc = (listingData.location || "").toLowerCase().trim();
        let simulatedCoords = [77.2090, 28.6130]; 

        if (loc.includes("new york") || loc.includes("nyc")) simulatedCoords = [-74.0060, 40.7128];
        else if (loc.includes("mumbai")) simulatedCoords = [72.8777, 19.0760];
        else if (loc.includes("goa")) simulatedCoords = [73.8180, 15.2990];
        else if (loc.includes("ranchi")) simulatedCoords = [85.3096, 23.3441];
        else if (loc.includes("bangalore") || loc.includes("bengaluru")) simulatedCoords = [77.5946, 12.9716];
        else if (loc.includes("kolkata")) simulatedCoords = [88.3639, 22.5726];
        else if (loc.includes("miami")) simulatedCoords = [-80.1918, 25.7617];
        else if (loc.includes("seoul") || loc.includes("korea")) simulatedCoords = [126.9780, 37.5665];

        newListing.geometry = { type: "Point", coordinates: simulatedCoords };

        await newListing.save();
        req.flash("success", "New Listing Created!");
        res.redirect("/listings");
    } catch (err) {
        next(err);
    }
};

// ==========================================================================
// 5. RENDER EDIT FORM ROUTE
// ==========================================================================
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

// ==========================================================================
// 6. UPDATE LISTING ROUTE
// ==========================================================================
module.exports.updateListing = async (req, res, next) => {
    try {
        let { id } = req.params;
        const listingData = req.body.listing;

        const loc = (listingData.location || "").toLowerCase().trim();
        let simulatedCoords = [77.2090, 28.6130]; 

        if (loc.includes("new york") || loc.includes("nyc")) simulatedCoords = [-74.0060, 40.7128];
        else if (loc.includes("mumbai")) simulatedCoords = [72.8777, 19.0760];
        else if (loc.includes("goa")) simulatedCoords = [73.8180, 15.2990];
        else if (loc.includes("ranchi")) simulatedCoords = [85.3096, 23.3441];
        else if (loc.includes("bangalore") || loc.includes("bengaluru")) simulatedCoords = [77.5946, 12.9716];
        else if (loc.includes("kolkata")) simulatedCoords = [88.3639, 22.5726];
        else if (loc.includes("miami")) simulatedCoords = [-80.1918, 25.7617];
        else if (loc.includes("seoul") || loc.includes("korea")) simulatedCoords = [126.9780, 37.5665];

        let listing = await Listing.findByIdAndUpdate(id, { ...listingData }, { runValidators: true, new: true });

        if (listingData.image && listingData.image.trim() !== "") {
            listing.image = { url: listingData.image, filename: "user_update" };
        }

        listing.geometry = { type: "Point", coordinates: simulatedCoords };

        await listing.save();
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        next(err);
    }
};

// ==========================================================================
// 7. DELETE LISTING ROUTE
// ==========================================================================
module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
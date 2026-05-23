if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const axios = require("axios");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/Wanderlust";

// Connect directly to your MongoDB Atlas Cluster
async function main() {
    await mongoose.connect(dbUrl);
}
main()
    .then(() => console.log("🚀 Connected to Cloud Production Database successfully!"))
    .catch((err) => console.log("❌ Database connection failure:", err));

// Engine View Layout Settings
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Standard Body Parsers & Static Asset Routing
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Mock authentication/flash variables to prevent EJS view errors
app.use((req, res, next) => {
    res.locals.success = [];
    res.locals.error = [];
    res.locals.currUser = null; 
    next();
});

// ==========================================================================
// 🛡️ INLINE LISTING SCHEMA (Bypasses all cross-file path errors)
// ==========================================================================
const Schema = mongoose.Schema;
const listingSchema = new Schema({
    title: { type: String, required: true },
    description: String,
    image: {
        filename: String,
        url: String
    },
    price: Number,
    location: String,
    country: String,
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    geometry: {
        type: { type: String, enum: ["Point"], required: true },
        coordinates: { type: [Number], required: true }
    }
});
const Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);

// ==========================================================================
// 🚀 CLEAN RENDER ROUTES FOR MAP VIEWING
// ==========================================================================

// Homepage Index Route - Shows all listings
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
});

// Show Route - Essential for Mapbox rendering
app.get("/listings/:id", async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
});

app.get("/", (req, res) => res.redirect("/listings"));

// ==========================================================================
// 🗺️ THE 100% CORRECT SHORTCUT ROADMAP TO REPAIR MAP COORDINATES
// ==========================================================================
app.get("/run-global-map-repair", async (req, res) => {
    try {
        const listings = await Listing.find({});
        const apiKey = process.env.GEO_API_KEY; 

        if (!apiKey) {
            return res.send("❌ Error: GEO_API_KEY is missing from Render environment variables!");
        }

        let fixCount = 0;
        for (let listing of listings) {
            try {
                const query = `${listing.location}, ${listing.country}`;
                const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
                
                const apiResponse = await axios.get(url, { timeout: 5000 });
                if (apiResponse.data && apiResponse.data.data && apiResponse.data.data[0]) {
                    const geo = apiResponse.data.data[0];
                    await Listing.findByIdAndUpdate(listing._id, {
                        $set: {
                            "geometry": {
                                type: "Point",
                                coordinates: [geo.longitude, geo.latitude] 
                            }
                        }
                    });
                    fixCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 300)); // Safety rate limiting delay
            } catch (inner) {
                console.log(`Skipping ${listing.location}: ${inner.message}`);
            }
        }
        res.send(`✨ SUCCESS! Cloud database script ran smoothly. Repaired coordinates for ${fixCount} listings in Atlas!`);
    } catch (err) {
        res.send("❌ Critical shortcut route execution failure: " + err.message);
    }
});

// Basic Error Handling Fallbacks
// To this new line:
// To this new line:
app.get("/*", (req, res) => res.status(404).send("Page Not Found"));
app.use((err, req, res, next) => {
    res.status(500).send("Something went wrong with the server engine layout.");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`📡 Map-centric server active on port ${PORT}`));
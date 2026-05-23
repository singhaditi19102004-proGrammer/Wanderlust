if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const axios = require("axios");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/Wanderlust";

// Connect to MongoDB Atlas
async function main() {
    await mongoose.connect(dbUrl);
}
main()
    .then(() => console.log("🚀 Connected to Cloud Production Database successfully!"))
    .catch((err) => console.log("❌ Database connection failure:", err));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ==========================================================================
// 🛡️ EXPRESS 5 / CONNECT-MONGO V6 SESSIONS CONFIGURATION
// ==========================================================================
const sessionOptions = {
    store: MongoStore.create({
        mongoUrl: dbUrl,
        crypto: { secret: process.env.SECRET || "presentation_backup_token" },
        touchAfter: 24 * 3600 
    }),
    secret: process.env.SECRET || "presentation_backup_token",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(flash());

// ==========================================================================
// 🛡️ MODEL CORES & PASSPORT REFERENCE BINDINGS
// ==========================================================================
const User = require("./models/user.js");
const Listing = require("./models/listing.js");

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser);
passport.deserializeUser(User.deserializeUser);

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ==========================================================================
// 🚀 ALL CORE ROUTERS
// ==========================================================================
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter); 

app.get("/", (req, res) => res.redirect("/listings"));

// ==========================================================================
// 🗺️ CLOUD-BASED OVERRIDE MAP REPAIR (Wipes out lingering Delhi/Placeholder errors)
// ==========================================================================
app.get("/run-global-map-repair", async (req, res) => {
    try {
        const listings = await Listing.find({});
        const apiKey = process.env.GEO_API_KEY || "60e94bb5e1358ef9c7b45ea1b65e90df"; 

        if (!apiKey) {
            return res.send("❌ Error: GEO_API_KEY tokens missing.");
        }

        let fixCount = 0;
        for (let listing of listings) {
            try {
                const coordinates = listing.geometry?.coordinates || [0, 0];
                const hasPlaceholderCoords = coordinates[0] === 0 && coordinates[1] === 0;
                
                // Pure filter targeting coordinates locking specifically to the fallback Delhi cluster
                const isPlaceholderDelhi = (coordinates[0] >= 77.0 && coordinates[0] <= 77.3) && (coordinates[1] >= 28.5 && coordinates[1] <= 28.7);
                
                if (hasPlaceholderCoords || isPlaceholderDelhi) {
                    
                    // Skip legitimate, real Delhi properties
                    if (listing.title && listing.title.toLowerCase().includes("delhi")) {
                        continue;
                    }

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
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Safer request throttling delay
                }
            } catch (inner) {
                console.log(`Skipping listing: ${inner.message}`);
            }
        }
        res.send(`✨ SUCCESS! Cloud system executed seamlessly. Overwrote and hard-fixed ${fixCount} placeholder listings inside Atlas cluster!`);
    } catch (err) {
        res.send("❌ Route crashed: " + err.message);
    }
});

// Fallback error-handling middleware stack
app.use((req, res) => {
    res.status(404).render("error.ejs", { message: "Page Not Found!" });
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    if (!res.headersSent) {
        res.status(statusCode).render("error.ejs", { message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`📡 Production cluster active on port ${PORT}`));
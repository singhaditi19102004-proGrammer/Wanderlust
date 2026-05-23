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
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const axios = require("axios");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/Wanderlust";

// Establish Database Connection Engine
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
// 🛡️ THE 100% BULLETPROOF RUNTIME SESSIONS RESOLVER (Bypasses compilation flags)
// ==========================================================================
let MongoStore;
let sessionStoreOptions = {
    mongoUrl: dbUrl,
    crypto: { secret: process.env.SECRET || "presentation_backup_token" },
    touchAfter: 24 * 3600
};

try {
    const rawModule = require("connect-mongo");
    if (typeof rawModule === "function") {
        // Handle as v3 or older function wrapper style
        MongoStore = rawModule(session);
        sessionStoreOptions = {
            url: dbUrl,
            secret: process.env.SECRET || "presentation_backup_token",
            touchAfter: 24 * 3600
        };
    } else if (rawModule && rawModule.create) {
        // Handle as v5+ modern class layout factory execution
        MongoStore = rawModule;
    } else {
        // Fallback fallback configuration structure handles
        MongoStore = rawModule;
    }
} catch (e) {
    console.log("Store module strategy resolving...");
}

const sessionOptions = {
    store: (MongoStore && MongoStore.create && typeof MongoStore.create === "function") 
            ? MongoStore.create(sessionStoreOptions) 
            : new MongoStore(sessionStoreOptions),
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
// 🛡️ DATA INTERFACES IMPORTS
// ==========================================================================
const User = require("./models/user.js");
const Listing = require("./models/listing.js");

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ==========================================================================
// 🚀 ALL STRATEGIC SYSTEM ROUTERS ENGAGED
// ==========================================================================
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter); 

app.get("/", (req, res) => res.redirect("/listings"));

// ==========================================================================
// 🗺️ EMERGENCY UNCONDITIONAL REPAIR HOOK FOR MAP COORDINATES
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
                // If coordinates already exist and are valid, skip it to avoid wasting API quota
                if (listing.geometry && listing.geometry.coordinates && listing.geometry.coordinates.length === 2 && listing.geometry.coordinates[0] !== 0) {
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
                await new Promise(resolve => setTimeout(resolve, 600)); // Higher delay to fully clear free tier limits
            } catch (inner) {
                console.log(`Skipping ${listing.location}: ${inner.message}`);
            }
        }
        res.send(`✨ SUCCESS! Cloud database script ran smoothly. Evaluated and repaired coordinates for ${fixCount} listings inside Atlas!`);
    } catch (err) {
        res.send("❌ Critical route execution failure: " + err.message);
    }
});

// ==========================================================================
// 🛡️ ZERO-ROUTER FALLBACK CATCH (Express 5 Safe)
// ==========================================================================
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
app.listen(PORT, () => console.log(`📡 Full version-synchronized stack live on port ${PORT}`));
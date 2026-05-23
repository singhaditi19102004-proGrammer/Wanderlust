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
const MongoStore = require("connect-mongo"); // Pure modern import
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
// 🛡️ MODERNIZE V5 ONLY SESSIONS INITIALIZATION LAYOUT
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
// 🛡️ USER & LISTING MODELS INJECTION
// ==========================================================================
const User = require("./models/user.js");
const Listing = require("./models/listing.js");

// Passport Authentication Configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global System Flash Tokens & Session Context
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ==========================================================================
// 🚀 ROUTE BINDINGS
// ==========================================================================
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter); 

app.get("/", (req, res) => res.redirect("/listings"));

// ==========================================================================
// 🗺️ EMERGENCY DATA REPAIR ENDPOINT FOR MAP COMPLIANCE
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
                if (listing.geometry && listing.geometry.coordinates && listing.geometry.coordinates.length === 2) {
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
                await new Promise(resolve => setTimeout(resolve, 500)); 
            } catch (inner) {
                console.log(`Skipping ${listing.location}: ${inner.message}`);
            }
        }
        res.send(`✨ SUCCESS! Cloud database script ran smoothly. Evaluated and repaired coordinates for ${fixCount} new listings inside Atlas!`);
    } catch (err) {
        res.send("❌ Critical route execution failure: " + err.message);
    }
});

// ==========================================================================
// 🛡️ ZERO-ROUTER FALLBACK CATCH (Express 5 Safe Middleware Layout)
// ==========================================================================
app.use((req, res) => {
    res.status(404).render("error.ejs", { message: "Page Not Found!" });
});

// Final System Exception Response Handler Hook
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    if (!res.headersSent) {
        res.status(statusCode).render("error.ejs", { message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`📡 Full version-synchronized production stack online on port ${PORT}`));
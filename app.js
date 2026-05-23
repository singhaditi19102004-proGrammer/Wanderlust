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
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/Wanderlust";

// Connect to MongoDB Atlas
async function main() {
    await mongoose.connect(dbUrl);
}
main()
    .then(() => console.log("🚀 Connected to Cloud Production Database successfully!"))
    .catch((err) => console.log("❌ Database connection engine failure:", err));

// View Engine Configurations
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body Parsers & Static Asset Routing Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Persistent Session Configuration Cluster
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: { secret: process.env.SECRET || "presentation_backup_token" },
    touchAfter: 24 * 3600 
});

const sessionOptions = {
    store,
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
// 🛡️ INLINE USER & LISTING MODELS (Bypasses external file case-sensitivity locks)
// ==========================================================================
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: { type: String, required: true }
});
try {
    const passportLocalMongoose = require("passport-local-mongoose");
    userSchema.plugin(passportLocalMongoose);
} catch (e) {
    console.log("Passport plugin error handled.");
}
let User = mongoose.models.User || mongoose.model("User", userSchema);

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
let Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);

// Passport Strategies Configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global System Response Flash Middleware Tokens Local Injection
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ==========================================================================
// 🚀 DYNAMIC CASE-INSENSITIVE ROUTER LOADING
// ==========================================================================
let listingRouter, reviewRouter, userRouter;
try { listingRouter = require("./routes/listing.js"); } catch(e) { listingRouter = require("./routes/Listing.js"); }
try { reviewRouter = require("./routes/review.js"); } catch(e) { reviewRouter = require("./routes/Review.js"); }
try { userRouter = require("./routes/user.js"); } catch(e) { userRouter = require("./routes/User.js"); }

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.get("/", (req, res) => res.redirect("/listings"));

// ==========================================================================
// 🗺️ EMERGENCY REPAIR HOOK FOR MAP COORDINATES (OWNERSHIP UNTOUCHED)
// ==========================================================================
const axios = require("axios");
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
                await new Promise(resolve => setTimeout(resolve, 350));
            } catch (inner) {
                console.log(`Skipping ${listing.location}: ${inner.message}`);
            }
        }
        res.send(`✨ SUCCESS! Cloud script ran smoothly. Evaluated and repaired coordinates for ${fixCount} listings in Atlas without changing ownership configurations!`);
    } catch (err) {
        res.send("❌ Critical route execution failure: " + err.message);
    }
});

// Catch-All Missing Route Handler
app.all("*", (req, res, next) => {
    res.status(404).render("error.ejs", { message: "Page Not Found!" });
});

// System Error Pipeline Middleware Error Handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    if (!res.headersSent) {
        res.status(statusCode).render("error.ejs", { message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`📡 Server active on port ${PORT}`));
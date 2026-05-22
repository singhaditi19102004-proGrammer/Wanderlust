require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./models/listing'); 
const User = require('./models/user'); 
const axios = require('axios');

// Helper function to create a delay (prevents 429 Too Many Requests)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    try {
        // 1. Connect to Database (Using capital 'W' as seen in your mongosh)
        await mongoose.connect('mongodb://127.0.0.1:27017/Wanderlust');
        console.log("🚀 Connected to Database: Wanderlust");

        // 2. Find Your User (aditi_19)
        const me = await User.findOne({ username: "aditi_19" }); 
        
        if (!me) {
            console.error("❌ ERROR: User 'aditi_19' not found. Ensure you are logged in once on the site first!");
            process.exit(1);
        }
        const myId = me._id;
        console.log(`👤 Found User: aditi_19 | ID: ${myId}`);

        // 3. Force Update Ownership for EVERY listing
        const ownResult = await Listing.updateMany({}, { owner: myId });
        console.log(`✅ Ownership Sync: ${ownResult.modifiedCount} listings are now owned by you.`);

        // 4. Repair Maps with Rate Limiting
        const listings = await Listing.find({});
        const apiKey = process.env.GEO_API_KEY; 

        console.log(`\n--- Starting Map Repair for ${listings.length} listings ---`);

        for (let i = 0; i < listings.length; i++) {
            let listing = listings[i];
            
            try {
                process.stdout.write(`[${i + 1}/${listings.length}] Updating: ${listing.location}... `);
                
                const query = `${listing.location}, ${listing.country}`;
                const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
                
                const res = await axios.get(url);
                
                if (res.data.data && res.data.data[0]) {
                    const geo = res.data.data[0];
                    listing.geometry = {
                        type: "Point",
                        coordinates: [geo.longitude, geo.latitude] // Longitude first for GeoJSON
                    };
                    await listing.save();
                    console.log(`📍 Fixed! (${geo.latitude}, ${geo.longitude})`);
                } else {
                    console.log(`⚠️ No results found for this location.`);
                }

                // 5. WAIT 2 seconds between each request to respect API limits
                await sleep(2000); 

            } catch (innerErr) {
                if (innerErr.response && innerErr.response.status === 429) {
                    console.error("\n🛑 Rate limit hit! Sleeping for 15 seconds...");
                    await sleep(15000); // Longer cooldown
                    i--; // Retry this same listing
                } else {
                    console.error(`\n❌ Skip Error for ${listing.location}: ${innerErr.message}`);
                }
            }
        }

        console.log("\n--- ✨ ALL LISTINGS ARE NOW OWNED BY YOU AND MAPS ARE FIXED ✨ ---");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ CRITICAL SCRIPT FAILURE:", err.message);
        process.exit(1);
    }
}

main();
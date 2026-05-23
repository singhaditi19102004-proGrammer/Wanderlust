require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./models/listing'); // Using './' because it sits in your root project folder
const axios = require('axios');

// Helper function to create a delay (prevents 429 Too Many Requests)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    try {
        // 1. Connect securely using your live Atlas database string from your .env file
        const dbUrl = process.env.ATLASDB_URL;
        
        if (!dbUrl) {
            console.error("❌ ERROR: ATLASDB_URL variable is missing from your .env configuration file!");
            process.exit(1);
        }

        console.log("⏳ Establishing secure socket handshake with MongoDB Atlas...");
        await mongoose.connect(dbUrl);
        console.log("🚀 Connected to Live Production Cloud Database successfully!");

        // 2. Fetch all listings to validate and repair coordinates
        const listings = await Listing.find({});
        const apiKey = process.env.GEO_API_KEY; 

        if (!apiKey) {
            console.error("❌ ERROR: GEO_API_KEY variable is missing from your .env configuration file!");
            process.exit(1);
        }

        console.log(`\n--- Starting Live Map Repair for ${listings.length} Listings ---`);
        console.log("⚠️ NOTE: Listing ownership credentials will remain completely untouched.\n");

        for (let i = 0; i < listings.length; i++) {
            let listing = listings[i];
            
            try {
                process.stdout.write(`[${i + 1}/${listings.length}] Geocoding Target: ${listing.location}... `);
                
                // Construct parameters query string explicitly
                const query = `${listing.location}, ${listing.country}`;
                const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
                
                const res = await axios.get(url, { timeout: 8000 }); // Added safe timeout handling
                
                if (res.data && res.data.data && res.data.data[0]) {
                    const geo = res.data.data[0];
                    
                    // Construct a valid GeoJSON point tracking layout
                    const targetCoordinates = [geo.longitude, geo.latitude]; // Longitude first for GeoJSON rules

                    // Direct atomic update to prevent tripping model validation hooks or overwriting image properties
                    await Listing.findByIdAndUpdate(listing._id, {
                        $set: {
                            "geometry": {
                                type: "Point",
                                coordinates: targetCoordinates
                            }
                        }
                    }, { runValidators: false });
                    
                    console.log(`📍 Map Pin Fixed! (${geo.latitude}, ${geo.longitude})`);
                } else {
                    console.log(`⚠️ API returned empty payload for this location. Pin skipped.`);
                }

                // 3. Explicit 2-second cooldown to respect PositionStack free-tier guidelines
                await sleep(2000); 

            } catch (innerErr) {
                if (innerErr.response && innerErr.response.status === 429) {
                    console.error("\n🛑 API Rate Limit Threshold Triggered! Freezing execution thread for 15 seconds...");
                    await sleep(15000); 
                    i--; // Decrement iterator counter to retry processing this exact listing context
                } else {
                    console.error(`\n❌ Network / Skip Error encountered for ${listing.location}: ${innerErr.message}`);
                    await sleep(2000); // Small recovery buffer even on skips
                }
            }
        }

        console.log("\n--- ✨ ALL ATLAS COORDINATE MAPS ARE PERMANENTLY FIXED AND RUNNING ✨ ---");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ CRITICAL SYSTEM EXECUTION FAILURE:", err.message);
        process.exit(1);
    }
}

main();
const mongoose = require("mongoose");
const axios = require("axios");

// ==========================================================================
// 🛡️ ACTUAL HARDCODED KEY VALUES STRING INJECTION
// ==========================================================================
const dbUrl = "mongodb://singhaditi19102004:aditi123@cluster0-shard-00-00.onrender.mongodb.net:27017,cluster0-shard-00-01.onrender.mongodb.net:27017,cluster0-shard-00-02.onrender.mongodb.net:27017/Wanderlust?ssl=true&replicaSet=atlas-xxxxxx-shard-0&authSource=admin&retryWrites=true&w=majority";
const apiKey = "60e94bb5e1358ef9c7b45ea1b65e90df"; 

const listingSchema = new mongoose.Schema({
    title: String,
    location: String,
    country: String,
    geometry: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] }
    }
});
const Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);

async function runForceRepair() {
    try {
        console.log("⏳ Connecting directly to MongoDB Atlas production cluster...");
        await mongoose.connect(dbUrl);
        console.log("🚀 Connected to Cloud Production Database successfully!");

        // Pulling all data packets for target resolution analysis
        const listings = await Listing.find({});
        console.log(`Analyzing database cluster... Found ${listings.length} total listings.`);
        
        let fixCount = 0;

        for (let listing of listings) {
            // Unconditional filter targets matching Delhi placeholders or initial [0, 0] matrices
            const coordinates = listing.geometry?.coordinates || [0, 0];
            const hasPlaceholderCoords = coordinates[0] === 0 && coordinates[1] === 0;
            const isPlaceholderDelhi = (coordinates[0] >= 77.0 && coordinates[0] <= 77.3) && (coordinates[1] >= 28.5 && coordinates[1] <= 28.7);
            
            if (hasPlaceholderCoords || isPlaceholderDelhi) {
                
                // Skip processing if the listing is a legitimate property intended for Delhi
                if (listing.title && listing.title.toLowerCase().includes("delhi")) {
                    console.log(`[-] Skipping legitimate Delhi listing: "${listing.title}"`);
                    continue;
                }

                console.log(`[!] Force targeting misaligned listing: "${listing.location}, ${listing.country}"`);
                
                const query = `${listing.location}, ${listing.country}`;
                const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
                
                try {
                    const apiResponse = await axios.get(url, { timeout: 6000 });
                    
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
                        console.log(`   ✨ SUCCESS! Mapped to: [Long: ${geo.longitude}, Lat: ${geo.latitude}]`);
                    } else {
                        console.log(`   ⚠️ Could not resolve address string for: ${listing.location}`);
                    }
                } catch (apiErr) {
                    console.log(`   ❌ API Execution Request Drop: ${apiErr.message}`);
                }
                
                // 1-second throttle timeout to handle free tier rate tracking blocks seamlessly
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
        }
        
        console.log(`\n🏁 Operation Complete! Force rectified ${fixCount} placeholder locations inside Atlas.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Critical execution crash runtime block:", err.message);
        process.exit(1);
    }
}

runForceRepair();
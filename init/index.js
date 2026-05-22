const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const axios = require('axios');

// 1. Local Connection String
// Change MONGO_URL to point to your Atlas environment string
const MONGO_URL = "mongodb://aditi_codes:TpknkuM1pEF18xhK@ac-yr1m7sn-shard-00-00.v0rrzt2.mongodb.net:27017,ac-yr1m7sn-shard-00-01.v0rrzt2.mongodb.net:27017,ac-yr1m7sn-shard-00-02.v0rrzt2.mongodb.net:27017/Wanderlust?ssl=true&authSource=admin&replicaSet=atlas-v0rrzt-shard-0";
// 2. Put your actual Positionstack API key here
const apiKey = "7c1c70e161ac2c24d0952381c0200d7c"; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

main().then(() => {
    console.log(" Connected to LOCAL DB");
    initDB();
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    try {
        await Listing.deleteMany({});
        console.log("Local Database cleared...");

        const updatedData = [];

        for (let i = 0; i < initData.data.length; i++) {
            let obj = initData.data[i];
            
            try {
                process.stdout.write(`[${i + 1}/${initData.data.length}] Geocoding: ${obj.location}... `);
                
                const query = `${obj.location}, ${obj.country}`;
                const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
                
                const res = await axios.get(url);
                let coords = [77.209, 28.613]; // Fallback

                if (res.data.data && res.data.data[0]) {
                    coords = [res.data.data[0].longitude, res.data.data[0].latitude];
                    console.log(` Fixed`);
                } else {
                    console.log(` Using default`);
                }

                updatedData.push({
                    ...obj,
                    // Replace this with your LOCAL aditi_19 user ID
                    owner: "69cc024bf4ea03db18cd6c07", 
                    geometry: {
                        type: "Point",
                        coordinates: coords,
                    }
                });

                // Wait 1 second to prevent the 429 error
                await sleep(1000);

            } catch (err) {
                console.log(` Error: ${err.message}`);
                updatedData.push({ ...obj, owner: "69cc024bf4ea03db18cd6c07", geometry: { type: "Point", coordinates: [77.209, 28.613] } });
            }
        }

        await Listing.insertMany(updatedData);
        console.log("\n LOCAL DATA INITIALIZED WITH CORRECT LOCATIONS! ");
        process.exit(0);

    } catch (err) {
        console.error("Critical Error:", err);
        process.exit(1);
    }
};


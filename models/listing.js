const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const cloudinary = require('cloudinary').v2;

const listingSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  image: {
    url: String,
    filename: String,
  },
  price: Number,
  location: String,
  country: String,
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  geometry: {
    type: {
        type: String,
        enum: ['Point'], // 'location.type' must be 'Point'
        required: true
    },
    coordinates: {
        type: [Number],
        required: true
    }
},

  
});

// Middleware to delete reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing && listing.image && listing.image.filename) {
        try {
            // This is the magic line that deletes from Cloudinary
            await cloudinary.uploader.destroy(listing.image.filename);
            console.log("Deleted image from Cloudinary:", listing.image.filename);
        } catch (err) {
            console.log("Cloudinary deletion failed:", err);
        }
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
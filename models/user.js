const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongooseModule = require("passport-local-mongoose");

// Determine the exact shape of the imported module to prevent runtime type errors
const passportLocalMongoose = (typeof passportLocalMongooseModule === "function")
    ? passportLocalMongooseModule
    : passportLocalMongooseModule.default || passportLocalMongooseModule;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    }
});

// Pass the verified function straight to the plugin engine configuration
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
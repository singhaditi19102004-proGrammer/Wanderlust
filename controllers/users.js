const Listing =require("../models/listing");
const Review = require("../models/review");
const User = require("../models/user");

module.exports.renderSignUpForm =(req, res) => {
    res.render("users/signup.ejs");
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
        req.flash("success", "Welcome back to Wanderlust!");
        
        // ADD THIS FALLBACK LOGIC:
        let redirectUrl = res.locals.redirectUrl || "/listings"; 
        
        res.redirect(redirectUrl);
    };

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
};    



module.exports.signup = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        
        // .register() is a convenience method provided by passport-local-mongoose
        const registeredUser = await User.register(newUser, password);
        
        console.log(registeredUser);
        req.login(registeredUser, (err)=>{
            if(err){
                return next(err);
            }
            req.flash("success", "Welcome to Wanderlust!");
             res.redirect("/listings");
        });
        
        
    } catch (e) {
        // If user already exists or email is taken, flash the specific error message
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};




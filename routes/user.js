const express = require("express");
const router = express.Router();
const passport = require("passport");

let userController;
try { userController = require("../controllers/users.js"); } catch(e) { userController = require("../Controllers/users.js"); }

const wrapAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.route("/signup")
    .get(userController.renderSignupForm || ((req,res)=>res.render("users/signup.ejs")))
    .post(wrapAsync(userController.signup || ((req,res,next)=>next())));

router.route("/login")
    .get(userController.renderLoginForm || ((req,res)=>res.render("users/login.ejs")))
    .post(passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
        req.flash("success", "Welcome back!");
        res.redirect("/listings");
    });

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    });
});

module.exports = router;
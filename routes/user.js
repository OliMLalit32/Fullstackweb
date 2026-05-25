const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");

router.route("/signup")
    .get(userController.renderSignUpForm)
    .post(wrapAsync(userController.signup));

router.route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true,
        }),
        wrapAsync(userController.login)
    );

router.get("/logout", userController.logout);

router.get("/my-dashboard", (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    if (req.user.role === "owner") return res.redirect("/owner/dashboard");
    if (req.user.role === "admin") return res.redirect("/admin/dashboard");
    return res.redirect("/bookings");
});

module.exports = router;

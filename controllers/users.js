const User = require("../models/user");
const Notification = require("../models/notification");

module.exports.renderSignUpForm = (req, res) => {
    const role = req.query.role || "client";
    res.render("users/signup.ejs", { role });
};

module.exports.signup = async (req, res) => {
    try {
        let { username, email, password, role, fullName, phone } = req.body;
        const allowedRoles = ["client", "owner"];
        const userRole = allowedRoles.includes(role) ? role : "client";
        const newUser = new User({ email, username, role: userRole, fullName: fullName || "", phone: phone || "" });
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", `Welcome to ApnaGhar, ${fullName || username}! You are registered as ${userRole === "owner" ? "a Property Owner" : "a Client"}.`);
            if (userRole === "owner") return res.redirect("/owner/dashboard");
            res.redirect("/listings");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    const role = req.query.role || null;
    res.render("users/login.ejs", { role });
};

module.exports.login = async (req, res) => {
    const user = req.user;
    req.flash("success", `Welcome back, ${user.fullName || user.username}!`);
    if (user.role === "admin") return res.redirect("/admin/dashboard");
    if (user.role === "owner") return res.redirect("/owner/dashboard");
    const redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "You have been logged out. See you soon!");
        res.redirect("/listings");
    });
};

module.exports.renderOwnerDashboard = async (req, res) => {
    const Listing = require("../models/listing");
    const Booking = require("../models/booking");

    const listings = await Listing.find({ owner: req.user._id });
    const listingIds = listings.map((l) => l._id);
    const bookings = await Booking.find({ listing: { $in: listingIds } })
        .populate("listing")
        .populate("client")
        .sort({ createdAt: -1 });

    const stats = {
        totalListings: listings.length,
        totalBookings: bookings.length,
        pendingBookings: bookings.filter((b) => b.status === "pending").length,
        confirmedBookings: bookings.filter((b) => b.status === "confirmed").length,
        totalRevenue: bookings
            .filter((b) => b.status === "confirmed" && b.paymentConfirmed)
            .reduce((sum, b) => sum + b.totalAmount, 0),
    };

    res.render("owner/dashboard.ejs", { listings, bookings, stats });
};

module.exports.renderClientDashboard = async (req, res) => {
    const Booking = require("../models/booking");
    const bookings = await Booking.find({ client: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });

    res.render("client/dashboard.ejs", { bookings });
};

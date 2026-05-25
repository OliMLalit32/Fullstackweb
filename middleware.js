const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError");
const { listingSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to continue.");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the owner of this listing.");
        return res.redirect(`/listings/${id}`);
    }
    next();
};

module.exports.isOwnerRole = (req, res, next) => {
    if (!req.user || (req.user.role !== "owner" && req.user.role !== "admin")) {
        req.flash("error", "Only property owners can access this area.");
        return res.redirect("/listings");
    }
    next();
};

module.exports.isClient = (req, res, next) => {
    if (!req.user || req.user.role === "owner") {
        req.flash("error", "Owners cannot make bookings. Please use a client account.");
        return res.redirect("/listings");
    }
    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        req.flash("error", "Admin access only.");
        return res.redirect("/listings");
    }
    next();
};

module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.isReviewAuther = async (req, res, next) => {
    let { id, reviewId } = req.params;
    let review = await Review.findById(reviewId);
    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the author of this review.");
        return res.redirect(`/listings/${id}`);
    }
    next();
};

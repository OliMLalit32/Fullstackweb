const Listing = require("../models/listing");
const User = require("../models/user");
const Booking = require("../models/booking");
const Notification = require("../models/notification");

module.exports.renderDashboard = async (req, res) => {
    const [totalListings, totalUsers, totalBookings, recentBookings, recentUsers] = await Promise.all([
        Listing.countDocuments(),
        User.countDocuments(),
        Booking.countDocuments(),
        Booking.find().populate("listing").populate("client").sort({ createdAt: -1 }).limit(10),
        User.find().sort({ createdAt: -1 }).limit(10),
    ]);

    const revenue = await Booking.aggregate([
        { $match: { status: "confirmed", paymentConfirmed: true } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const owners = await User.countDocuments({ role: "owner" });
    const clients = await User.countDocuments({ role: "client" });

    res.render("admin/dashboard.ejs", {
        stats: { totalListings, totalUsers, totalBookings, totalRevenue, pendingBookings, owners, clients },
        recentBookings,
        recentUsers,
    });
};

module.exports.listAllListings = async (req, res) => {
    const listings = await Listing.find().populate("owner").sort({ _id: -1 });
    res.render("admin/listings.ejs", { listings });
};

module.exports.listAllUsers = async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.render("admin/users.ejs", { users });
};

module.exports.listAllBookings = async (req, res) => {
    const bookings = await Booking.find()
        .populate("listing")
        .populate("client")
        .sort({ createdAt: -1 });
    res.render("admin/bookings.ejs", { bookings });
};

module.exports.deleteListing = async (req, res) => {
    await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", "Listing deleted by admin.");
    res.redirect("/admin/listings");
};

module.exports.updateUserRole = async (req, res) => {
    const { role } = req.body;
    const allowedRoles = ["client", "owner", "admin"];
    if (!allowedRoles.includes(role)) {
        req.flash("error", "Invalid role.");
        return res.redirect("/admin/users");
    }
    await User.findByIdAndUpdate(req.params.id, { role });
    req.flash("success", "User role updated.");
    res.redirect("/admin/users");
};

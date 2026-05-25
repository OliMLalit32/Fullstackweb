const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { createBookingRequest, createNotification, getBookedDates } = require("../utils/bookingService");

module.exports.renderNewBooking = async (req, res) => {
    const listing = await Listing.findById(req.params.id).populate("owner");
    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }
    const bookedDates = await getBookedDates(listing._id);

    res.render("bookings/new.ejs", { listing, bookedDates });
};

module.exports.createBooking = async (req, res, next) => {
    try {
        const { booking } = await createBookingRequest({
            listingId: req.params.id,
            client: req.user,
            input: req.body,
            io: req.app.get("io"),
        });

        req.flash("success", "Booking request submitted! Proceed to confirm your booking.");
        res.redirect(`/bookings/${booking._id}/confirmation`);
    } catch (err) {
        if (err.statusCode && err.statusCode < 500) {
            req.flash("error", err.message);
            const redirectPath = err.statusCode === 404 ? "/listings" : `/listings/${req.params.id}/book`;
            return res.redirect(redirectPath);
        }

        next(err);
    }
};

module.exports.renderConfirmation = async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate("listing")
        .populate("client");

    if (!booking || booking.client._id.toString() !== req.user._id.toString()) {
        req.flash("error", "Booking not found.");
        return res.redirect("/listings");
    }
    res.render("bookings/confirmation.ejs", { booking });
};

module.exports.confirmPayment = async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate("listing");
    if (!booking || booking.client.toString() !== req.user._id.toString()) {
        req.flash("error", "Booking not found.");
        return res.redirect("/listings");
    }

    booking.paymentConfirmed = true;
    await booking.save();

    req.flash("success", "Payment confirmed! Your booking is now awaiting owner approval.");
    res.redirect(`/bookings/${booking._id}/confirmation`);
};

module.exports.listClientBookings = async (req, res) => {
    const bookings = await Booking.find({ client: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });
    res.render("bookings/index.ejs", { bookings });
};

module.exports.ownerUpdateBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate("listing")
        .populate("client");

    if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/owner/dashboard");
    }

    if (booking.listing.owner.toString() !== req.user._id.toString()) {
        req.flash("error", "Unauthorized.");
        return res.redirect("/owner/dashboard");
    }

    const { action } = req.body;
    const io = req.app.get("io");

    if (action === "confirm") {
        booking.status = "confirmed";
        await booking.save();
        await createNotification(
            io,
            booking.client._id,
            "booking_confirmed",
            "Booking Confirmed!",
            `Great news! Your booking for "${booking.listing.title}" has been confirmed by the owner.`,
            `/bookings/${booking._id}/confirmation`
        );
        req.flash("success", "Booking confirmed successfully.");
    } else if (action === "reject") {
        booking.status = "rejected";
        await booking.save();
        await createNotification(
            io,
            booking.client._id,
            "booking_rejected",
            "Booking Update",
            `Unfortunately, your booking request for "${booking.listing.title}" was not accepted. Please try other dates or properties.`,
            `/listings`
        );
        req.flash("success", "Booking rejected.");
    } else if (action === "cancel") {
        booking.status = "cancelled";
        await booking.save();
        req.flash("success", "Booking cancelled.");
    }

    res.redirect("/owner/dashboard");
};

module.exports.cancelBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate("listing");
    if (!booking || booking.client.toString() !== req.user._id.toString()) {
        req.flash("error", "Booking not found.");
        return res.redirect("/bookings");
    }
    booking.status = "cancelled";
    await booking.save();

    const io = req.app.get("io");
    await createNotification(
        io,
        booking.listing.owner,
        "booking_cancelled",
        "Booking Cancelled",
        `A booking for "${booking.listing.title}" has been cancelled by the client.`,
        `/owner/dashboard`
    );

    req.flash("success", "Booking cancelled.");
    res.redirect("/bookings");
};

module.exports.getAvailability = async (req, res) => {
    const bookedDates = await Booking.find({
        listing: req.params.id,
        status: { $in: ["pending", "confirmed"] },
    }).select("checkIn checkOut");
    res.json(bookedDates);
};

const Booking = require("../models/booking");
const Listing = require("../models/listing");
const Notification = require("../models/notification");
const ExpressError = require("./ExpressError");

async function createNotification(io, recipientId, type, title, message, link = "") {
    const notification = new Notification({
        recipient: recipientId,
        type,
        title,
        message,
        link,
    });

    await notification.save();

    if (io) {
        io.to(recipientId.toString()).emit("notification", {
            id: notification._id,
            type,
            title,
            message,
            link,
            createdAt: notification.createdAt,
        });
    }
}

function parseDateInput(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new ExpressError(400, `${label} is required.`);
    }

    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        throw new ExpressError(400, `${label} must be in YYYY-MM-DD format.`);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        throw new ExpressError(400, `${label} is invalid.`);
    }

    return parsed;
}

function normalizeGuests(guests) {
    if (guests === undefined || guests === null || guests === "") {
        return 1;
    }

    const parsedGuests = Number.parseInt(guests, 10);
    if (!Number.isInteger(parsedGuests) || parsedGuests < 1 || parsedGuests > 10) {
        throw new ExpressError(400, "Guests must be between 1 and 10.");
    }

    return parsedGuests;
}

async function getBookedDates(listingId) {
    return Booking.find({
        listing: listingId,
        status: { $in: ["pending", "confirmed"] },
    })
        .select("checkIn checkOut")
        .sort({ checkIn: 1 });
}

async function createBookingRequest({ listingId, client, input, io }) {
    const listing = await Listing.findById(listingId).populate("owner");
    if (!listing) {
        throw new ExpressError(404, "Listing not found.");
    }

    const checkInDate = parseDateInput(input.checkIn, "Check-in date");
    const checkOutDate = parseDateInput(input.checkOut, "Check-out date");

    if (checkInDate >= checkOutDate) {
        throw new ExpressError(400, "Check-out must be after check-in.");
    }

    const conflictingBooking = await Booking.findOne({
        listing: listing._id,
        status: { $in: ["pending", "confirmed"] },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
    });

    if (conflictingBooking) {
        throw new ExpressError(409, "Those dates are not available. Please choose different dates.");
    }

    const guests = normalizeGuests(input.guests);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = nights * listing.price;

    const booking = new Booking({
        listing: listing._id,
        client: client._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        totalAmount,
        specialRequests: typeof input.specialRequests === "string" ? input.specialRequests.trim() : "",
        status: "pending",
    });

    await booking.save();

    await createNotification(
        io,
        listing.owner._id,
        "booking_request",
        "New Booking Request",
        `${client.fullName || client.username} has requested to book "${listing.title}" from ${checkInDate.toDateString()} to ${checkOutDate.toDateString()}.`,
        `/owner/bookings/${booking._id}`
    );

    return { booking, listing, checkInDate, checkOutDate };
}

module.exports = {
    createBookingRequest,
    createNotification,
    getBookedDates,
};

const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isClient } = require("../middleware");
const bookingController = require("../controllers/bookings");

router.get("/:id/book", isLoggedIn, isClient, wrapAsync(bookingController.renderNewBooking));
router.post("/:id/book", isLoggedIn, isClient, wrapAsync(bookingController.createBooking));
router.get("/:id/availability", wrapAsync(bookingController.getAvailability));

module.exports = router;

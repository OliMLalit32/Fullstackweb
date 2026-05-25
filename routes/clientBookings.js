const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const bookingController = require("../controllers/bookings");

router.get("/", isLoggedIn, wrapAsync(bookingController.listClientBookings));
router.get("/:id/confirmation", isLoggedIn, wrapAsync(bookingController.renderConfirmation));
router.post("/:id/pay", isLoggedIn, wrapAsync(bookingController.confirmPayment));
router.post("/:id/cancel", isLoggedIn, wrapAsync(bookingController.cancelBooking));
router.post("/:id/owner-action", isLoggedIn, wrapAsync(bookingController.ownerUpdateBooking));

module.exports = router;

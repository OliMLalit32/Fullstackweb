const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin");

router.use(isLoggedIn, isAdmin);

router.get("/dashboard", wrapAsync(adminController.renderDashboard));
router.get("/listings", wrapAsync(adminController.listAllListings));
router.get("/users", wrapAsync(adminController.listAllUsers));
router.get("/bookings", wrapAsync(adminController.listAllBookings));
router.delete("/listings/:id", wrapAsync(adminController.deleteListing));
router.post("/users/:id/role", wrapAsync(adminController.updateUserRole));

module.exports = router;

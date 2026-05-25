const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isOwnerRole } = require("../middleware");
const userController = require("../controllers/users");

router.get("/dashboard", isLoggedIn, isOwnerRole, wrapAsync(userController.renderOwnerDashboard));

module.exports = router;

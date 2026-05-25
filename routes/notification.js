const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const notifController = require("../controllers/notifications");

router.get("/", isLoggedIn, wrapAsync(notifController.listNotifications));
router.post("/:id/read", isLoggedIn, wrapAsync(notifController.markRead));
router.post("/mark-all-read", isLoggedIn, wrapAsync(notifController.markAllRead));
router.get("/count", notifController.getUnreadCount);

module.exports = router;

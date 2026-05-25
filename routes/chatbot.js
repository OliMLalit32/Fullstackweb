const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const chatbotController = require("../controllers/chatbot");

router.post("/:id/chatbot/message", wrapAsync(chatbotController.message));
router.post("/:id/chatbot/speak", wrapAsync(chatbotController.speak));
router.post("/:id/chatbot/book", wrapAsync(chatbotController.createBookingFromChat));

module.exports = router;

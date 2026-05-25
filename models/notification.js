const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: [
            "booking_request",
            "booking_confirmed",
            "booking_rejected",
            "booking_cancelled",
            "payment_confirmed",
            "review_added",
            "general",
        ],
        default: "general",
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        default: "",
    },
    read: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Notification", notificationSchema);

const Listing = require("../models/listing");
const { createBookingRequest, getBookedDates } = require("../utils/bookingService");
const { synthesizeSpeech } = require("../utils/murf");

function formatCurrency(amount) {
    return `Rs ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function parseFlexibleDate(value) {
    if (!value) return null;

    let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
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
            return null;
        }

        return parsed;
    }

    match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    return parsed;
}

function extractDateRange(message) {
    const isoDates = [...message.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((match) => match[0]);
    if (isoDates.length >= 2) {
        const start = parseFlexibleDate(isoDates[0]);
        const end = parseFlexibleDate(isoDates[1]);
        if (start && end) return { start, end };
    }

    const slashDates = [...message.matchAll(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g)].map((match) => match[0]);
    if (slashDates.length >= 2) {
        const start = parseFlexibleDate(slashDates[0]);
        const end = parseFlexibleDate(slashDates[1]);
        if (start && end) return { start, end };
    }

    return null;
}

function buildFeaturesReply(listing, normalizedMessage) {
    const amenities = [
        { keyword: "wifi", feature: "Wifi", label: "WiFi" },
        { keyword: "furnished", feature: "Furnished", label: "a furnished setup" },
        { keyword: "kitchen", feature: "Private Kitchen", label: "a private kitchen" },
        { keyword: "bathroom", feature: "Attached Bathroom", label: "an attached bathroom" },
        { keyword: "single", feature: "Single Room", label: "a single room" },
        { keyword: "double", feature: "Double Sharing", label: "double sharing" },
        { keyword: "independent", feature: "Independent", label: "an independent option" },
    ];

    const matchedAmenity = amenities.find((item) => normalizedMessage.includes(item.keyword));
    if (matchedAmenity) {
        const hasFeature = listing.features.includes(matchedAmenity.feature);
        return hasFeature
            ? `Yes, this property includes ${matchedAmenity.label}.`
            : `This listing does not mention ${matchedAmenity.label}.`;
    }

    if (!listing.features.length) {
        return "This listing does not have any amenities listed yet.";
    }

    return `This property includes ${listing.features.join(", ")}.`;
}

function buildAvailabilityReply(bookings, message) {
    const dateRange = extractDateRange(message);

    if (!dateRange) {
        if (!bookings.length) {
            return "There are no blocked dates recorded right now. Share check-in and check-out dates in YYYY-MM-DD format and I will verify the stay for you.";
        }

        return "Tell me your check-in and check-out dates in YYYY-MM-DD format, and I will check availability for you.";
    }

    if (dateRange.start >= dateRange.end) {
        return "Please send the dates with check-out after check-in so I can verify the stay.";
    }

    const hasConflict = bookings.some((booking) => {
        const bookedStart = new Date(booking.checkIn);
        const bookedEnd = new Date(booking.checkOut);
        return dateRange.start < bookedEnd && dateRange.end > bookedStart;
    });

    if (hasConflict) {
        return `The property is not available from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}. Try another date range and I will check again.`;
    }

    return `Good news, this property is available from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}. You can use the quick booking form below to place the request.`;
}

function buildBookingReply(user) {
    if (!user) {
        return "You can ask anything about this property here. When you are ready to book, log in as a client and use the quick booking form below.";
    }

    if (user.role !== "client") {
        return "Booking is available only for client accounts. Please use a client account to place the booking request.";
    }

    return "Use the quick booking form below to choose your dates, guests, and request notes. After submitting it, you will land on the confirmation page and can finish the payment step.";
}

function buildDefaultReply(listing) {
    const amenitiesText = listing.features.length ? listing.features.join(", ") : "the essentials listed on the page";
    return `This is ${listing.title} in ${listing.location}, ${listing.country}. It costs ${formatCurrency(listing.price)} per night and offers ${amenitiesText}. Ask me about price, amenities, availability, or booking and I will guide you.`;
}

function buildAssistantReply({ listing, bookings, user, message }) {
    const normalizedMessage = message.toLowerCase();
    const averageRating = listing.reviews.length
        ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) / listing.reviews.length
        : null;

    if (/\b(?:hello|hi|hey|namaste)\b/.test(normalizedMessage)) {
        return {
            reply: `Hello! I am the ApnaGhar assistant for ${listing.title}. Ask me about rent, amenities, availability, or how booking works.`,
            intent: "general",
        };
    }

    if (/(?:what is apna ?ghar|about apna ?ghar|\bplatform\b|\bwebsite\b)/.test(normalizedMessage)) {
        return {
            reply: "ApnaGhar helps clients discover student-friendly rentals, send booking requests, confirm bookings, and track them from the bookings dashboard. Owners manage listings and approvals from their own dashboard.",
            intent: "general",
        };
    }

    if (/\b(?:price|rent|cost|charge|fee)\b/.test(normalizedMessage)) {
        return {
            reply: `${listing.title} is listed at ${formatCurrency(listing.price)} per night.`,
            intent: "general",
        };
    }

    if (/\b(?:where|location|address|area|near)\b/.test(normalizedMessage)) {
        return {
            reply: `${listing.title} is located in ${listing.location}, ${listing.country}. You can also use the map on this page to see the area.`,
            intent: "general",
        };
    }

    if (/\b(?:feature|amenity|amenities|wifi|furnished|kitchen|bathroom|single|double|sharing|independent)\b/.test(normalizedMessage)) {
        return {
            reply: buildFeaturesReply(listing, normalizedMessage),
            intent: "general",
        };
    }

    if (/\b(?:owner|host)\b/.test(normalizedMessage)) {
        const ownerName = listing.owner.fullName || listing.owner.username;
        return {
            reply: `${listing.title} is hosted by ${ownerName}.`,
            intent: "general",
        };
    }

    if (/\b(?:review|rating|feedback)\b/.test(normalizedMessage)) {
        if (!listing.reviews.length) {
            return {
                reply: "This listing does not have any reviews yet.",
                intent: "general",
            };
        }

        return {
            reply: `${listing.title} has ${listing.reviews.length} review${listing.reviews.length === 1 ? "" : "s"} with an average rating of ${averageRating.toFixed(1)} out of 5.`,
            intent: "general",
        };
    }

    if (/\b(?:available|availability|date|dates)\b/.test(normalizedMessage)) {
        return {
            reply: buildAvailabilityReply(bookings, message),
            intent: "availability",
        };
    }

    if (/\b(?:book|booking|reserve|reservation|order)\b/.test(normalizedMessage)) {
        return {
            reply: buildBookingReply(user),
            intent: "booking",
        };
    }

    if (/\b(?:payment|pay|confirm)\b/.test(normalizedMessage)) {
        return {
            reply: "The booking flow here is simple: submit the booking request, confirm the payment step on the confirmation page, and then wait for the owner to approve or reject it.",
            intent: "booking",
        };
    }

    if (/\b(?:cancel|cancellation)\b/.test(normalizedMessage)) {
        return {
            reply: "Clients can cancel pending or confirmed bookings from the booking confirmation page or the bookings dashboard.",
            intent: "booking",
        };
    }

    return {
        reply: buildDefaultReply(listing),
        intent: "general",
    };
}

async function loadListingOrReturn(req, res) {
    const listing = await Listing.findById(req.params.id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        res.status(404).json({ message: "Listing not found." });
        return null;
    }

    return listing;
}

module.exports.message = async (req, res) => {
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!message) {
        return res.status(400).json({ message: "Ask a question to start the chat." });
    }

    const listing = await loadListingOrReturn(req, res);
    if (!listing) return;

    const bookings = await getBookedDates(listing._id);
    const assistantReply = buildAssistantReply({
        listing,
        bookings,
        user: req.user,
        message,
    });

    res.json({
        reply: assistantReply.reply,
        intent: assistantReply.intent,
        voiceEnabled: Boolean(process.env.MURF_API_KEY),
    });
};

module.exports.speak = async (req, res) => {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
        return res.status(400).json({ message: "Text is required for voice playback." });
    }

    try {
        const result = await synthesizeSpeech(text);
        res.json(result);
    } catch (err) {
        res.status(err.statusCode || 500).json({
            message: err.message || "Murf voice playback is unavailable right now.",
        });
    }
};

module.exports.createBookingFromChat = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Please log in as a client to book from chat.",
            loginUrl: "/login",
        });
    }

    if (req.user.role !== "client") {
        return res.status(403).json({
            message: "Only client accounts can place bookings from chat.",
        });
    }

    try {
        const { booking, listing } = await createBookingRequest({
            listingId: req.params.id,
            client: req.user,
            input: req.body,
            io: req.app.get("io"),
        });

        res.json({
            message: `Your booking request for "${listing.title}" has been created. Opening the confirmation page now.`,
            redirectUrl: `/bookings/${booking._id}/confirmation`,
        });
    } catch (err) {
        res.status(err.statusCode || 500).json({
            message: err.statusCode ? err.message : "We could not create the booking right now. Please try again.",
        });
    }
};

if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking.js");
const clientBookingsRouter = require("./routes/clientBookings.js");
const notificationRouter = require("./routes/notification.js");
const adminRouter = require("./routes/admin.js");
const ownerRouter = require("./routes/owner.js");
const chatbotRouter = require("./routes/chatbot.js");

const dbUrl = process.env.ATLASDB_URL;

if (dbUrl) {
    main()
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch((err) => {
            console.log("MongoDB connection error:", err);
        });
} else {
    console.warn("WARNING: ATLASDB_URL is not set. Database features will be disabled.");
}

async function main() {
    await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const sessionSecret = process.env.SECRET || "apnaghar-dev-secret-change-in-production";

const sessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

if (dbUrl) {
    const store = MongoStore.create({
        mongoUrl: dbUrl,
        crypto: { secret: sessionSecret },
        touchAfter: 24 * 3600,
    });
    store.on("error", (err) => {
        console.log("Error in Mongo Store", err);
    });
    sessionOptions.store = store;
}

app.get("/", (req, res) => {
    if (!dbUrl) return res.redirect("/setup");
    res.redirect("/listings");
});

app.get("/setup", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ApnaGhar – Setup Required</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <style>
    body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #f5f3ff, #fdf4ff); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .setup-card { background: white; border-radius: 24px; padding: 3rem 2.5rem; max-width: 560px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.12); border: 1px solid #e5e7eb; }
    .icon-circle { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #9333ea); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; color: white; margin: 0 auto 1.5rem; }
    h2 { font-weight: 800; color: #1a1a2e; }
    .step { display: flex; align-items: flex-start; gap: 1rem; padding: 0.85rem; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 0.75rem; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; background: #7c3aed; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
    code { background: #ede9fe; color: #5b21b6; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
    .btn-refresh { background: #7c3aed; color: white; border: none; border-radius: 999px; padding: 0.75rem 2rem; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 1.5rem; width: 100%; transition: background 0.2s; }
    .btn-refresh:hover { background: #5b21b6; }
  </style>
</head>
<body>
  <div class="setup-card">
    <div class="icon-circle"><i class="fa-solid fa-house-chimney"></i></div>
    <h2 class="text-center mb-2">ApnaGhar Setup</h2>
    <p class="text-center text-muted mb-4">Please configure the required secrets to get started.</p>
    <div class="step">
      <div class="step-num">1</div>
      <div><strong>MongoDB Atlas URL</strong><br><small class="text-muted">Set <code>ATLASDB_URL</code> in Secrets — your MongoDB connection string</small></div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div><strong>Session Secret</strong><br><small class="text-muted">Set <code>SECRET</code> — any long random string</small></div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div><strong>Cloudinary (for images)</strong><br><small class="text-muted">Set <code>CLOUD_NAME</code>, <code>CLOUD_API_KEY</code>, <code>CLOUD_API_SECRET</code></small></div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div><strong>Mapbox Token (for maps)</strong><br><small class="text-muted">Set <code>MAP_TOKEN</code> — get it from mapbox.com</small></div>
    </div>
    <div class="step">
      <div class="step-num">5</div>
      <div><strong>Murf API (for voice chatbot)</strong><br><small class="text-muted">Set <code>MURF_API_KEY</code> and optionally <code>MURF_VOICE_ID</code>, <code>MURF_LOCALE</code>, <code>MURF_STYLE</code></small></div>
    </div>
    <p class="text-muted small text-center mt-3">After adding all secrets, restart the application.</p>
    <button class="btn-refresh" onclick="location.reload()"><i class="fa-solid fa-rotate-right me-2"></i>Check Again</button>
  </div>
</body>
</html>`);
});

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

app.set("io", io);

io.on("connection", (socket) => {
    socket.on("join", (userId) => {
        socket.join(userId);
    });
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/listings", bookingRouter);
app.use("/listings", chatbotRouter);
app.use("/bookings", clientBookingsRouter);
app.use("/notifications", notificationRouter);
app.use("/admin", adminRouter);
app.use("/owner", ownerRouter);
app.use("/", userRouter);

app.use((req, res, next) => {
    res.status(404).render("error.ejs", {
        statusCode: 404,
        message: "Page Not Found",
    });
});

app.use((err, req, res, next) => {
    console.error("ERROR:", err);
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).render("error.ejs", { statusCode, message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`ApnaGhar server running on port ${PORT}`);
});

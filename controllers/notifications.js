const Notification = require("../models/notification");

module.exports.listNotifications = async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
    res.render("notifications/index.ejs", { notifications });
};

module.exports.markRead = async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user._id },
        { read: true }
    );
    res.json({ success: true });
};

module.exports.markAllRead = async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    req.flash("success", "All notifications marked as read.");
    res.redirect("/notifications");
};

module.exports.getUnreadCount = async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ count: 0 });
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    res.json({ count });
};

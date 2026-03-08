const express = require("express");
const Maid = require("../models/Maid");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const SupportTicket = require("../models/SupportTicket");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* ------------------ Dashboard Stats ------------------ */
router.get("/stats", auth, role("admin"), async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: "customer" });
    const totalMaids = await User.countDocuments({ role: "maid" });
    const totalBookings = await Booking.countDocuments();
    const pendingApprovals = await Maid.countDocuments({ is_approved: false });
    const completedBookings = await Booking.countDocuments({
      status: "completed",
    });
    const openTickets = await SupportTicket.countDocuments({ status: "open" });
    const revenue = await Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$total_charge" } } },
    ]);
    res.json({
      totalCustomers,
      totalMaids,
      totalBookings,
      pendingApprovals,
      completedBookings,
      openTickets,
      totalRevenue: revenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get All Customers ------------------ */
router.get("/customers", auth, role("admin"), async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get All Maids ------------------ */
router.get("/maids", auth, role("admin"), async (req, res) => {
  try {
    const maids = await Maid.find()
      .populate("user", "-password")
      .sort({ createdAt: -1 });
    const result = maids.map((m) => ({
      id: m._id,
      full_name: m.user?.full_name,
      email: m.user?.email,
      phone: m.user?.phone,
      services: m.services,
      languages: m.languages,
      preferred_location: m.preferred_location,
      experience_years: m.experience_years,
      hourly_rate: m.hourly_rate,
      is_approved: m.is_approved,
      is_available: m.is_available,
      rating: m.rating,
      total_reviews: m.total_reviews,
      isActive: m.user?.isActive,
      userId: m.user?._id,
      createdAt: m.createdAt,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Approve Maid ------------------ */
router.patch("/approve/:maidId", auth, role("admin"), async (req, res) => {
  try {
    const maid = await Maid.findById(req.params.maidId);
    if (!maid) return res.status(404).json({ message: "Maid not found" });
    maid.is_approved = true;
    await maid.save();
    res.json({ message: "Maid approved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Suspend / Activate User ------------------ */
router.patch("/suspend/:userId", auth, role("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({
      isActive: user.isActive,
      message: user.isActive ? "User activated" : "User suspended",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get All Bookings ------------------ */
router.get("/bookings", auth, role("admin"), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "-password")
      .populate({
        path: "maid",
        populate: { path: "user", select: "-password" },
      })
      .sort({ createdAt: -1 });
    const result = bookings.map((b) => ({
      id: b._id,
      customer_name: b.customer?.full_name || "Unknown",
      customer_email: b.customer?.email || "",
      maid_name: b.maid?.user?.full_name || "Unknown",
      service: b.service,
      date: b.booking_date
        ? new Date(b.booking_date).toLocaleDateString("en-IN")
        : "—",
      status: b.status,
      total_charge: b.total_charge,
      createdAt: b.createdAt,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get All Reviews ------------------ */
router.get("/reviews", auth, role("admin"), async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("customer", "-password")
      .populate({
        path: "maid",
        populate: { path: "user", select: "-password" },
      })
      .sort({ createdAt: -1 });
    const result = reviews.map((r) => ({
      id: r._id,
      customer_name: r.customer?.full_name || "Unknown",
      maid_name: r.maid?.user?.full_name || "Unknown",
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get All Support Tickets ------------------ */
router.get("/support", auth, role("admin"), async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("user", "-password")
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Update Support Ticket ------------------ */
router.patch("/support/:id", auth, role("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id })
      .populate({
        path: "maid",
        populate: { path: "user", select: "full_name" },
      })
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => ({
      id: b._id,
      maid_name: b.maid?.user?.full_name || "Unknown",
      service: b.service,
      booking_date: b.booking_date,
      status: b.status,
      total_charge: b.total_charge,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

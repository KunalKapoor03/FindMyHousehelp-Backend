const express = require("express");
const bcrypt = require("bcryptjs");
const Booking = require("../models/Booking");
const Maid = require("../models/Maid");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* ------------------ Dashboard ------------------ */
router.get("/dashboard", auth, role("customer"), async (req, res) => {
  try {
    const upcoming = await Booking.countDocuments({
      customer: req.user.id,
      status: "accepted",
    });
    const pending = await Booking.countDocuments({
      customer: req.user.id,
      status: "pending",
    });
    const completed = await Booking.countDocuments({
      customer: req.user.id,
      status: "completed",
    });
    const user = await User.findById(req.user.id).select("-password");
    res.json({ name: user.full_name, upcoming, pending, completed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get All Approved Maids ------------------ */
router.get("/maids", auth, role("customer"), async (req, res) => {
  try {
    const maids = await Maid.find({
      is_approved: true,
      is_available: true,
    }).populate("user", "-password");
    const result = maids.map((m) => ({
      id: m._id,
      full_name: m.user?.full_name,
      email: m.user?.email,
      phone: m.user?.phone,
      services: JSON.stringify(m.services || []),
      languages: JSON.stringify(m.languages || []),
      preferred_work_location: m.preferred_location,
      years_of_experience: m.experience_years,
      hourly_rate: m.hourly_rate,
      rating: m.rating,
      total_reviews: m.total_reviews,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get My Bookings ------------------ */
router.get("/bookings", auth, role("customer"), async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id })
      .populate({
        path: "maid",
        populate: { path: "user", select: "-password" },
      })
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => ({
      id: b._id,
      maid_name: b.maid?.user?.full_name || "Unknown",
      maid_phone: b.maid?.user?.phone || "",
      service: b.service,
      date: b.booking_date,
      status: b.status,
      hourly_rate: b.maid?.hourly_rate,
      total_charge: b.total_charge,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Create Booking ------------------ */
router.post("/bookings", auth, role("customer"), async (req, res) => {
  try {
    const { maid_id, service, date } = req.body;
    const maid = await Maid.findById(maid_id);
    if (!maid || !maid.is_available || !maid.is_approved)
      return res.status(400).json({ message: "Maid unavailable" });

    const booking = await Booking.create({
      customer: req.user.id,
      maid: maid_id,
      service,
      booking_date: date,
      status: "pending",
    });
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get Profile ------------------ */
router.get("/profile", auth, role("customer"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Update Profile ------------------ */
router.put("/profile", auth, role("customer"), async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { full_name, phone },
      { new: true },
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Change Password ------------------ */
router.put("/change-password", auth, role("customer"), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

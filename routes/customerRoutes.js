const express = require("express");
const bcrypt = require("bcryptjs");
const Booking = require("../models/Booking");
const Maid = require("../models/Maid");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* ================= DASHBOARD ================= */

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

    res.json({
      name: user.full_name,
      upcoming,
      pending,
      completed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= GET MAIDS ================= */

router.get("/maids", auth, role("customer"), async (req, res) => {
  try {
    const maids = await Maid.find({
      is_approved: true,
      is_available: true,
    }).populate("user", "-password");

    const result = maids.map((m) => ({
      id: m._id,
      full_name: m.user?.full_name,
      phone: m.user?.phone,
      services: m.services,
      languages: m.languages,
      preferred_location: m.preferred_location,
      experience_years: m.experience_years,
      hourly_rate: m.hourly_rate,
      rating: m.rating,
      total_reviews: m.total_reviews,
      is_available: m.is_available,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get Single Maid Profile ------------------ */
router.get("/maids/:id", auth, role("customer"), async (req, res) => {
  try {
    const maid = await Maid.findById(req.params.id).populate(
      "user",
      "-password",
    );

    if (!maid) {
      return res.status(404).json({ message: "Maid not found" });
    }

    const result = {
      id: maid._id,
      full_name: maid.user?.full_name,
      email: maid.user?.email,
      phone: maid.user?.phone,
      services: maid.services || [],
      languages: maid.languages || [],
      preferred_location: maid.preferred_location,
      years_of_experience: maid.experience_years,
      hourly_rate: maid.hourly_rate,
      rating: maid.rating,
      total_reviews: maid.total_reviews,
      is_available: maid.is_available,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= BOOKINGS ================= */

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
      booking_date: b.booking_date,
      status: b.status,
      total_charge: b.total_charge,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= CREATE BOOKING ================= */

router.post("/bookings", auth, role("customer"), async (req, res) => {
  try {
    const { maid_id, service, date } = req.body;

    const maid = await Maid.findById(maid_id);

    if (!maid || !maid.is_available || !maid.is_approved) {
      return res.status(400).json({ message: "Maid unavailable" });
    }

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

/* ================= CANCEL BOOKING ================= */

router.patch(
  "/bookings/:id/cancel",
  auth,
  role("customer"),
  async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "cancelled";

    await booking.save();

    res.json({ message: "Booking cancelled" });
  },
);

/* ================= PROFILE ================= */

router.get("/profile", auth, role("customer"), async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  res.json(user);
});

router.put("/profile", auth, role("customer"), async (req, res) => {
  const { full_name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { full_name, phone },
    { new: true },
  ).select("-password");

  res.json(user);
});

router.put("/change-password", auth, role("customer"), async (req, res) => {
  const { current_password, new_password } = req.body;

  const user = await User.findById(req.user.id);

  const match = await bcrypt.compare(current_password, user.password);

  if (!match)
    return res.status(400).json({ message: "Current password incorrect" });

  user.password = await bcrypt.hash(new_password, 10);

  await user.save();

  res.json({ message: "Password changed" });
});

module.exports = router;

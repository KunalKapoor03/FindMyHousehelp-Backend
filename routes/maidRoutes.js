const express = require("express");
const bcrypt = require("bcryptjs");
const Maid = require("../models/Maid");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* =====================================================
GET ALL MAIDS (Public)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const maids = await Maid.find({
      is_approved: true,
      is_available: true,
    }).populate("user", "-password");

    const result = maids.map((m) => ({
      _id: m._id,
      full_name: m.user?.full_name,
      location: m.preferred_location,
      hourly_rate: m.hourly_rate,
      rating: m.rating,
      is_available: m.is_available,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
MAID DASHBOARD STATS
===================================================== */
router.get("/dashboard", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });
    if (!maid) return res.status(404).json({ message: "Maid not found" });

    // FIX: Correctly Summing Earnings for THIS maid
    const earningsStats = await Booking.aggregate([
      { $match: { maid: maid._id, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$total_charge" } } },
    ]);

    const stats = {
      name: (await User.findById(req.user.id)).full_name,
      totalEarnings: earningsStats[0]?.total || 0, // This is the key fix
      pending: await Booking.countDocuments({
        maid: maid._id,
        status: "pending",
      }),
      upcoming: await Booking.countDocuments({
        maid: maid._id,
        status: "accepted",
      }),
      completed: await Booking.countDocuments({
        maid: maid._id,
        status: "completed",
      }),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
GET MAID BOOKINGS
===================================================== */
router.get("/bookings", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });

    if (!maid)
      return res.status(404).json({ message: "Maid profile not found" });

    const bookings = await Booking.find({ maid: maid._id })
      .populate("customer", "-password")
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => ({
      id: b._id,
      customer_name: b.customer?.full_name || "Unknown",
      customer_phone: b.customer?.phone || "",
      service: b.service,
      date: b.booking_date ? new Date(b.booking_date).toISOString() : null,
      time: b.start_time,
      duration: b.duration_hours,
      total_charge: b.total_charge,
      status: b.status,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
UPDATE BOOKING STATUS
===================================================== */
router.put("/bookings/:id", auth, role("maid"), async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = status === "upcoming" ? "accepted" : status;

    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
GET MAID PROFILE
===================================================== */
router.get("/profile", auth, role("maid"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const maid = await Maid.findOne({ user: req.user.id });

    res.json({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      services: maid?.services || [],
      languages: maid?.languages || [],
      preferred_work_location: maid?.preferred_location || "",
      years_of_experience: maid?.experience_years || 0,
      hourly_rate: maid?.hourly_rate || 0,
      address: maid?.address || "",
      is_available: maid?.is_available || false,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
UPDATE MAID PROFILE
===================================================== */
router.put("/profile", auth, role("maid"), async (req, res) => {
  try {
    const {
      full_name,
      phone,
      services,
      languages,
      preferred_work_location,
      years_of_experience,
      hourly_rate,
      address,
    } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      full_name,
      phone,
    });

    await Maid.findOneAndUpdate(
      { user: req.user.id },
      {
        services,
        languages,
        preferred_location: preferred_work_location,
        experience_years: years_of_experience,
        hourly_rate,
        address,
      },
      { new: true },
    );

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
CHANGE PASSWORD
===================================================== */
router.put("/change-password", auth, role("maid"), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findById(req.user.id);

    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    user.password = await bcrypt.hash(new_password, 10);

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
TOGGLE AVAILABILITY
===================================================== */
router.patch("/availability", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });

    if (!maid) return res.status(404).json({ message: "Maid not found" });

    maid.is_available = req.body.available;

    await maid.save();

    res.json({ available: maid.is_available });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
GET MAID REVIEWS
===================================================== */
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ maid: req.params.id })
      .populate("customer", "full_name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
GET SINGLE MAID PROFILE
===================================================== */
router.get("/:id", async (req, res) => {
  try {
    const maid = await Maid.findById(req.params.id).populate(
      "user",
      "-password",
    );

    if (!maid) {
      return res.status(404).json({ message: "Maid not found" });
    }

    res.json({
      _id: maid._id,
      full_name: maid.user?.full_name,
      preferred_location: maid.preferred_location,
      hourly_rate: maid.hourly_rate,
      rating: maid.rating,
      services: maid.services,
      is_available: maid.is_available,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

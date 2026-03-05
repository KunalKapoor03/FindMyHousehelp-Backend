const express = require("express");
const Booking = require("../models/Booking");
const Maid = require("../models/Maid");
const Review = require("../models/Review");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* =====================================================
   GET ALL BOOKINGS (Admin)
===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "-password")
      .populate({
        path: "maid",
        populate: { path: "user", select: "-password" },
      });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   CREATE BOOKING (Customer)
===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    const { maidId, booking_date, start_time, duration_hours } = req.body;

    const maid = await Maid.findById(maidId);

    if (!maid || !maid.is_available || !maid.is_approved) {
      return res.status(400).json({ message: "Maid unavailable" });
    }

    const total_charge = maid.hourly_rate * duration_hours;

    const booking = await Booking.create({
      customer: req.user.id,
      maid: maidId,
      booking_date,
      start_time,
      duration_hours,
      total_charge,
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   GET MY BOOKINGS (Customer or Maid)
===================================================== */
router.get("/my", auth, async (req, res) => {
  try {
    const maidProfile = await Maid.findOne({ user: req.user.id });

    const bookings = await Booking.find({
      $or: [
        { customer: req.user.id },
        ...(maidProfile ? [{ maid: maidProfile._id }] : []),
      ],
    })
      .populate("customer", "-password")
      .populate({
        path: "maid",
        populate: { path: "user", select: "-password" },
      });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   UPDATE BOOKING STATUS
===================================================== */
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   ADD REVIEW (Only After Completion)
===================================================== */
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        message: "Cannot review before completion",
      });
    }

    const existingReview = await Review.findOne({
      booking: booking._id,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "Review already submitted",
      });
    }

    const review = await Review.create({
      booking: booking._id,
      maid: booking.maid,
      rating,
      comment,
    });

    /* ===============================
       UPDATE MAID RATING
    =============================== */

    const maid = await Maid.findById(booking.maid);

    const newTotal = maid.rating * maid.total_reviews + rating;

    maid.total_reviews += 1;
    maid.rating = newTotal / maid.total_reviews;

    await maid.save();

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/cancel", auth, async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  booking.status = "cancelled";

  await booking.save();

  res.json({ message: "Booking cancelled" });
});

/* ================= ADD REVIEW ================= */

router.post(
  "/bookings/:id/review",
  auth,
  role("customer"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);

      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      const review = await Review.create({
        customer: req.user.id,
        maid: booking.maid,
        rating: req.body.rating,
        comment: req.body.comment,
      });

      res.json(review);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

router.get("/maid/earnings", auth, async (req, res) => {
  try {
    const maidProfile = await Maid.findOne({ user: req.user.id });

    if (!maidProfile) {
      return res.status(404).json({ message: "Maid profile not found" });
    }

    const bookings = await Booking.find({
      maid: maidProfile._id,
      status: "completed",
    });

    const total = bookings.reduce((sum, b) => sum + b.total_charge, 0);

    const now = new Date();

    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const weekly = bookings
      .filter((b) => new Date(b.booking_date) >= startOfWeek)
      .reduce((sum, b) => sum + b.total_charge, 0);

    const monthly = bookings
      .filter((b) => new Date(b.booking_date) >= startOfMonth)
      .reduce((sum, b) => sum + b.total_charge, 0);

    res.json({
      week: weekly,
      month: monthly,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= MAID EARNINGS ================= */

router.get("/maid/earnings", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });

    if (!maid) {
      return res.status(404).json({ message: "Maid profile not found" });
    }

    const bookings = await Booking.find({
      maid: maid._id,
      status: "completed",
    });

    let total = 0;
    let week = 0;
    let month = 0;

    const now = new Date();
    const weekAgo = new Date();
    const monthAgo = new Date();

    weekAgo.setDate(now.getDate() - 7);
    monthAgo.setMonth(now.getMonth() - 1);

    bookings.forEach((b) => {
      total += b.total_charge;

      if (new Date(b.createdAt) >= weekAgo) {
        week += b.total_charge;
      }

      if (new Date(b.createdAt) >= monthAgo) {
        month += b.total_charge;
      }
    });

    res.json({
      week,
      month,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

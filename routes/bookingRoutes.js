const express = require("express");
const Booking = require("../models/Booking");
const Maid = require("../models/Maid");
const Review = require("../models/Review");
const auth = require("../middleware/authMiddleware");

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

module.exports = router;

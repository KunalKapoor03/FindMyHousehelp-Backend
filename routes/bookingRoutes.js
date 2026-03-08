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

    const formatted = bookings.map((b) => ({
      ...b._doc,
      booking_date: b.booking_date
        ? new Date(b.booking_date).toISOString()
        : null,
      total_charge: b.total_charge || 0,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   CREATE BOOKING (Customer)
===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    const { maidId, service, booking_date, start_time, duration_hours } =
      req.body;

    const maid = await Maid.findById(maidId);

    if (!maid || !maid.is_available || !maid.is_approved) {
      return res.status(400).json({ message: "Maid unavailable" });
    }

    const hours = Number(duration_hours);
    const total_charge = maid.hourly_rate * duration_hours;

    const booking = await Booking.create({
      customer: req.user.id,
      maid: maidId,
      service,
      booking_date,
      start_time,
      duration_hours: hours,
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
      .populate("customer", "full_name phone")
      .populate({
        path: "maid",
        populate: { path: "user", select: "full_name" },
      });

    // FIX: Mapping the results to ensure date and charge are clean
    const formattedBookings = bookings.map((b) => ({
      ...b._doc,
      // ✅ Try both field names, fallback to createdAt
      booking_date: b.booking_date
        ? new Date(b.booking_date).toISOString()
        : b.date
          ? new Date(b.date).toISOString()
          : new Date(b.createdAt).toISOString(),
      total_charge: Number(b.total_charge) || 0,
    }));

    res.json(formattedBookings);
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

    if (!booking || booking.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Invalid booking or not completed" });
    }

    const review = await Review.create({
      booking: booking._id,
      maid: booking.maid,
      customer: booking.customer,
      rating: Number(rating),
      comment,
    });

    /* UPDATE MAID RATING WITH ROUNDING */
    const maid = await Maid.findById(booking.maid);
    const currentTotalPoints = (maid.rating || 0) * (maid.total_reviews || 0);
    const newTotalReviews = (maid.total_reviews || 0) + 1;

    // FIX: Rounding to 1 decimal place (e.g., 4.8)
    const newAverage = (currentTotalPoints + Number(rating)) / newTotalReviews;
    maid.rating = Math.round(newAverage * 10) / 10;
    maid.total_reviews = newTotalReviews;

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

/* ================= MAID EARNINGS ================= */

router.get("/maid/earnings", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });
    if (!maid) return res.status(404).json({ message: "Maid not found" });

    const stats = await Booking.aggregate([
      { $match: { maid: maid._id, status: "completed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$total_charge" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalEarnings = stats.length > 0 ? stats[0].total : 0;

    const now = new Date();
    const allCompleted = await Booking.find({
      maid: maid._id,
      status: "completed",
    });

    const monthly = allCompleted
      .filter(
        (b) =>
          new Date(b.booking_date).getMonth() === now.getMonth() &&
          new Date(b.booking_date).getFullYear() === now.getFullYear(),
      )
      .reduce((sum, b) => sum + (Number(b.total_charge) || 0), 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - 7);
    const weekly = allCompleted
      .filter((b) => new Date(b.booking_date) >= startOfWeek)
      .reduce((sum, b) => sum + (Number(b.total_charge) || 0), 0);

    res.json({ week: weekly, month: monthly, total: totalEarnings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

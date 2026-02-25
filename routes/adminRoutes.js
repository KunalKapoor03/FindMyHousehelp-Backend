const express = require("express");
const Maid = require("../models/Maid");
const User = require("../models/User");
const Booking = require("../models/Booking");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* ------------------ Dashboard Stats ------------------ */
router.get("/stats", auth, role("admin"), async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalMaids = await Maid.countDocuments();
  const totalBookings = await Booking.countDocuments();
  const revenue = await Booking.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: null, total: { $sum: "$total_charge" } } },
  ]);

  res.json({
    totalUsers,
    totalMaids,
    totalBookings,
    totalRevenue: revenue[0]?.total || 0,
  });
});

/* ------------------ Approve Maid ------------------ */
router.patch("/approve/:maidId", auth, role("admin"), async (req, res) => {
  const maid = await Maid.findById(req.params.maidId);
  if (!maid) return res.status(404).json({ message: "Maid not found" });

  maid.is_approved = true;
  await maid.save();

  res.json({ message: "Maid approved" });
});

/* ------------------ Suspend User ------------------ */
router.patch("/suspend/:userId", auth, role("admin"), async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = !user.isActive;
  await user.save();

  res.json({ isActive: user.isActive });
});

module.exports = router;

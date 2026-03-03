const express = require("express");
const bcrypt = require("bcryptjs");
const Maid = require("../models/Maid");
const User = require("../models/User");
const Booking = require("../models/Booking");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* ------------------ Get All Maids (Public) ------------------ */
router.get("/", async (req, res) => {
  try {
    const maids = await Maid.find({
      is_available: true,
      is_approved: true,
    }).populate("user", "-password");

    res.json(maids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Dashboard ------------------ */
router.get("/dashboard", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });
    if (!maid)
      return res.status(404).json({ message: "Maid profile not found" });

    const pending = await Booking.countDocuments({
      maid: maid._id,
      status: "pending",
    });
    const upcoming = await Booking.countDocuments({
      maid: maid._id,
      status: "accepted",
    });
    const completed = await Booking.countDocuments({
      maid: maid._id,
      status: "completed",
    });
    const user = await User.findById(req.user.id).select("-password");

    res.json({ name: user.full_name, pending, upcoming, completed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Get My Bookings ------------------ */
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
      date: b.booking_date,
      status: b.status,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Update Booking Status ------------------ */
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

/* ------------------ Get Profile ------------------ */
router.get("/profile", auth, role("maid"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const maid = await Maid.findOne({ user: req.user.id });
    res.json({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      services: JSON.stringify(maid?.services || []),
      languages: JSON.stringify(maid?.languages || []),
      preferred_work_location: maid?.preferred_location || "",
      years_of_experience: maid?.experience_years || 0,
      hourly_rate: maid?.hourly_rate || 0,
      address: maid?.address || "",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ Update Profile ------------------ */
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
    await User.findByIdAndUpdate(req.user.id, { full_name, phone });

    const parsedServices = (() => {
      try {
        return typeof services === "string"
          ? JSON.parse(services)
          : services || [];
      } catch {
        return [];
      }
    })();
    const parsedLanguages = (() => {
      try {
        return typeof languages === "string"
          ? JSON.parse(languages)
          : languages || [];
      } catch {
        return [];
      }
    })();

    await Maid.findOneAndUpdate(
      { user: req.user.id },
      {
        services: parsedServices,
        languages: parsedLanguages,
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

/* ------------------ Change Password ------------------ */
router.put("/change-password", auth, role("maid"), async (req, res) => {
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

/* ------------------ Toggle Availability ------------------ */
router.patch("/availability", auth, role("maid"), async (req, res) => {
  try {
    const maid = await Maid.findOne({ user: req.user.id });
    if (!maid) return res.status(404).json({ message: "Maid not found" });
    maid.is_available = !maid.is_available;
    await maid.save();
    res.json({ is_available: maid.is_available });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

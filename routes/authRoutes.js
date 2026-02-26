const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const User = require("../models/User");
const Maid = require("../models/Maid");
const generateToken = require("../utils/generateToken");

const router = express.Router();

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

/* ------------------ REGISTER CUSTOMER ------------------ */
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, phone, role } = req.body;

    if (!full_name || !email || !password)
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      full_name,
      email,
      password: hashedPassword,
      phone,
      role: role || "customer",
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ------------------ REGISTER MAID ------------------ */
router.post(
  "/register/maid",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        full_name,
        email,
        password,
        phone,
        services,
        languages,
        years_of_experience,
        hourly_rate,
        preferred_work_location,
        address,
      } = req.body;

      if (!full_name || !email || !password)
        return res
          .status(400)
          .json({ message: "Please fill all required fields" });

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        full_name,
        email,
        password: hashedPassword,
        phone,
        role: "maid",
      });

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

      await Maid.create({
        user: user._id,
        services: parsedServices,
        languages: parsedLanguages,
        experience_years: years_of_experience || 0,
        hourly_rate: hourly_rate || 0,
        preferred_location: preferred_work_location || "",
        address: address || "",
      });

      const token = generateToken(user);
      res.status(201).json({
        token,
        user: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

/* ------------------ LOGIN ------------------ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Please provide email and password" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    if (!user.isActive)
      return res
        .status(403)
        .json({ message: "Account suspended. Contact support." });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

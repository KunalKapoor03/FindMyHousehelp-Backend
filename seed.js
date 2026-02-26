const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();

const User = require("./models/User");
const Maid = require("./models/Maid");
const Booking = require("./models/Booking");
const Review = require("./models/Review");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected");

  await User.deleteMany({});
  await Maid.deleteMany({});
  await Booking.deleteMany({});
  await Review.deleteMany({});
  console.log("Cleared existing data");

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  await User.create({
    full_name: "Super Admin",
    email: "admin@findmyhousehelp.com",
    password: hash("admin123"),
    phone: "+919999999999",
    role: "admin",
  });

  const customers = await User.insertMany([
    {
      full_name: "Kunal Kapoor",
      email: "kunal@example.com",
      password: hash("kunal123"),
      phone: "+918368762914",
      role: "customer",
    },
    {
      full_name: "Priya Sharma",
      email: "priya@example.com",
      password: hash("priya123"),
      phone: "+917654321098",
      role: "customer",
    },
    {
      full_name: "Rahul Verma",
      email: "rahul@example.com",
      password: hash("rahul123"),
      phone: "+916543210987",
      role: "customer",
    },
    {
      full_name: "Sneha Gupta",
      email: "sneha@example.com",
      password: hash("sneha123"),
      phone: "+915432109876",
      role: "customer",
    },
    {
      full_name: "Amit Joshi",
      email: "amit@example.com",
      password: hash("amit123"),
      phone: "+914321098765",
      role: "customer",
    },
  ]);

  const maidUsers = await User.insertMany([
    {
      full_name: "Sunita Devi",
      email: "sunita@example.com",
      password: hash("sunita123"),
      phone: "+913210987654",
      role: "maid",
    },
    {
      full_name: "Meena Kumari",
      email: "meena@example.com",
      password: hash("meena123"),
      phone: "+912109876543",
      role: "maid",
    },
    {
      full_name: "Radha Rani",
      email: "radha@example.com",
      password: hash("radha123"),
      phone: "+911098765432",
      role: "maid",
    },
    {
      full_name: "Kavita Singh",
      email: "kavita@example.com",
      password: hash("kavita123"),
      phone: "+910987654321",
      role: "maid",
    },
    {
      full_name: "Pooja Yadav",
      email: "pooja@example.com",
      password: hash("pooja123"),
      phone: "+919876543210",
      role: "maid",
    },
    {
      full_name: "Anita Pandey",
      email: "anita@example.com",
      password: hash("anita123"),
      phone: "+918765432109",
      role: "maid",
    },
  ]);

  const maids = await Maid.insertMany([
    {
      user: maidUsers[0]._id,
      services: ["House Cleaning", "Laundry"],
      languages: ["Hindi", "English"],
      experience_years: 5,
      hourly_rate: 200,
      preferred_location: "Delhi",
      address: "Lajpat Nagar, New Delhi",
      is_available: true,
      is_approved: true,
      rating: 4.5,
      total_reviews: 12,
    },
    {
      user: maidUsers[1]._id,
      services: ["Cooking", "House Cleaning"],
      languages: ["Hindi", "English", "Punjabi"],
      experience_years: 3,
      hourly_rate: 250,
      preferred_location: "Noida",
      address: "Sector 18, Noida",
      is_available: true,
      is_approved: true,
      rating: 4.8,
      total_reviews: 20,
    },
    {
      user: maidUsers[2]._id,
      services: ["Babysitting", "Elderly Care"],
      languages: ["Hindi", "English"],
      experience_years: 7,
      hourly_rate: 300,
      preferred_location: "Gurgaon",
      address: "DLF Phase 2, Gurgaon",
      is_available: true,
      is_approved: true,
      rating: 4.9,
      total_reviews: 35,
    },
    {
      user: maidUsers[3]._id,
      services: ["Pet Care", "House Cleaning"],
      languages: ["Hindi", "English", "Marathi"],
      experience_years: 2,
      hourly_rate: 180,
      preferred_location: "Faridabad",
      address: "NIT, Faridabad",
      is_available: true,
      is_approved: true,
      rating: 4.2,
      total_reviews: 8,
    },
    {
      user: maidUsers[4]._id,
      services: ["Cooking", "Babysitting", "Laundry"],
      languages: ["Hindi", "English", "Bengali"],
      experience_years: 4,
      hourly_rate: 220,
      preferred_location: "Delhi",
      address: "Dwarka, New Delhi",
      is_available: true,
      is_approved: true,
      rating: 4.6,
      total_reviews: 15,
    },
    {
      user: maidUsers[5]._id,
      services: ["Elderly Care", "Cooking"],
      languages: ["Hindi", "English"],
      experience_years: 6,
      hourly_rate: 280,
      preferred_location: "Noida",
      address: "Sector 62, Noida",
      is_available: false,
      is_approved: true,
      rating: 4.7,
      total_reviews: 22,
    },
  ]);

  const bookings = await Booking.insertMany([
    {
      customer: customers[0]._id,
      maid: maids[0]._id,
      service: "House Cleaning",
      booking_date: new Date("2026-02-10"),
      status: "completed",
      total_charge: 400,
    },
    {
      customer: customers[1]._id,
      maid: maids[1]._id,
      service: "Cooking",
      booking_date: new Date("2026-02-15"),
      status: "completed",
      total_charge: 500,
    },
    {
      customer: customers[2]._id,
      maid: maids[2]._id,
      service: "Babysitting",
      booking_date: new Date("2026-02-20"),
      status: "accepted",
      total_charge: 600,
    },
    {
      customer: customers[3]._id,
      maid: maids[3]._id,
      service: "Pet Care",
      booking_date: new Date("2026-03-01"),
      status: "pending",
      total_charge: 360,
    },
    {
      customer: customers[4]._id,
      maid: maids[4]._id,
      service: "Laundry",
      booking_date: new Date("2026-03-05"),
      status: "pending",
      total_charge: 440,
    },
    {
      customer: customers[0]._id,
      maid: maids[2]._id,
      service: "Elderly Care",
      booking_date: new Date("2026-01-25"),
      status: "completed",
      total_charge: 900,
    },
    {
      customer: customers[1]._id,
      maid: maids[4]._id,
      service: "Cooking",
      booking_date: new Date("2026-02-28"),
      status: "accepted",
      total_charge: 660,
    },
  ]);

  await Review.insertMany([
    {
      booking: bookings[0]._id,
      maid: maids[0]._id,
      customer: customers[0]._id,
      rating: 5,
      comment:
        "Sunita did an excellent job cleaning the house. Very thorough and professional!",
    },
    {
      booking: bookings[1]._id,
      maid: maids[1]._id,
      customer: customers[1]._id,
      rating: 5,
      comment:
        "Meena's cooking was absolutely delicious. Will definitely book again!",
    },
    {
      booking: bookings[5]._id,
      maid: maids[2]._id,
      customer: customers[0]._id,
      rating: 4,
      comment:
        "Radha was very caring with my elderly mother. Highly recommended.",
    },
  ]);

  console.log("✅ Seed data inserted!");
  console.log("\n📋 Login Credentials:");
  console.log("─────────────────────────────────────────────────");
  console.log("ADMIN:    admin@findmyhousehelp.com  /  admin123");
  console.log("CUSTOMER: kunal@example.com          /  kunal123");
  console.log("CUSTOMER: priya@example.com          /  priya123");
  console.log("MAID:     sunita@example.com         /  sunita123");
  console.log("MAID:     meena@example.com          /  meena123");
  console.log("MAID:     radha@example.com          /  radha123");
  console.log("─────────────────────────────────────────────────");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

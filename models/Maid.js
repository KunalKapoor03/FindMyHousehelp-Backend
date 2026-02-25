const mongoose = require("mongoose");

const maidSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    services: [String],
    languages: [String],
    experience_years: { type: Number, default: 0 },
    hourly_rate: { type: Number, default: 0 },
    preferred_location: { type: String, default: "" },
    address: { type: String, default: "" },
    is_available: { type: Boolean, default: true },
    is_approved: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    total_reviews: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Maid", maidSchema);

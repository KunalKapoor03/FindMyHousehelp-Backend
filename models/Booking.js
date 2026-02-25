const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    maid: { type: mongoose.Schema.Types.ObjectId, ref: "Maid" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    service: { type: String, default: "" },
    booking_date: Date,
    start_time: String,
    duration_hours: Number,
    total_charge: Number,
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);

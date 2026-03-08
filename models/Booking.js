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

// Automatically calculate total_charge if duration and maid rate are available
bookingSchema.pre("save", async function (next) {
  if (this.isModified("duration_hours") || this.isNew) {
    const Maid = mongoose.model("Maid");
    const maidData = await Maid.findById(this.maid);
    if (maidData && this.duration_hours) {
      this.total_charge = maidData.hourly_rate * this.duration_hours;
    }
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);

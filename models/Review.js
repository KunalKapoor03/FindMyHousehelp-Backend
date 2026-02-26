const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    maid: { type: mongoose.Schema.Types.ObjectId, ref: "Maid" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Review", reviewSchema);

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    maid: { type: mongoose.Schema.Types.ObjectId, ref: "Maid" },
    rating: Number,
    comment: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Review", reviewSchema);

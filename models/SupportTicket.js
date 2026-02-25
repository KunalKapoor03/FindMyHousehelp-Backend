const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subject: String,
    message: String,
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SupportTicket", supportSchema);

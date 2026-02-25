const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    full_name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    role: {
      type: String,
      enum: ["customer", "maid", "admin"],
      default: "customer",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);

const express = require("express");
const SupportTicket = require("../models/SupportTicket");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ------------------ Create Ticket ------------------ */
router.post("/", auth, async (req, res) => {
  const { subject, message } = req.body;

  const ticket = await SupportTicket.create({
    user: req.user.id,
    subject,
    message,
  });

  res.json(ticket);
});

/* ------------------ Get All Tickets (Admin) ------------------ */
router.get("/", auth, async (req, res) => {
  const tickets = await SupportTicket.find().populate("user", "-password");

  res.json(tickets);
});

/* ------------------ Update Status ------------------ */
router.patch("/:id/status", auth, async (req, res) => {
  const { status } = req.body;

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  ticket.status = status;
  await ticket.save();

  res.json(ticket);
});

module.exports = router;

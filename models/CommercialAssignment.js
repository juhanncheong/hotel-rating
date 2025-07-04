const mongoose = require("mongoose");

const commercialAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: {
      type: Number,
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    assignedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // or "User" if your admins are also users
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CommercialAssignment",
  commercialAssignmentSchema
);

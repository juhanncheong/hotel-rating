const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ipAddress: String,
  ipCountry: String,
  balance: {
    type: Number,
    default: 0
  },
  highestSingleDeposit: {
    type: Number,
    default: 0
  },
  vipRank: {
    type: String,
    enum: ["Bronze", "Silver", "Gold"],
    default: "Bronze"
  },
  orderCount: {
    type: Number,
    default: 0
  },

  orderCount: {
  type: Number,
  default: 0
},

trialBonus: {
  amount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active"
  }
},

  orderResetAt: {
    type: Date,
    default: new Date(0),
  },
  createdAt: { type: Date, default: Date.now },
});



module.exports = mongoose.model("User", userSchema);

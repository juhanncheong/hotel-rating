const mongoose = require('mongoose');

const claimedDaySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  dateClaimed: { type: Date, required: true },
  amount: { type: Number, required: true }
});

const signInRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimedDays: [claimedDaySchema],
  currentDay: { type: Number, default: 1 },
  lastClaimDate: { type: Date, default: null }
});

module.exports = mongoose.model('SignInReward', signInRewardSchema);

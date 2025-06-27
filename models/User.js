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
  createdAt: { type: Date, default: Date.now },
});



module.exports = mongoose.model("User", userSchema);

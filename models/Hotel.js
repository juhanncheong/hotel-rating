const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  description: String,
  country: String,
}, { timestamps: true });

module.exports = mongoose.model("Hotel", hotelSchema);

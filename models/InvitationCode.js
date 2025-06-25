const mongoose = require('mongoose');

const invitationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // optional
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('InvitationCode', invitationCodeSchema);

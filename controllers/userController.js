const User = require('../models/User');
const InvitationCode = require('../models/InvitationCode');
const axios = require('axios');
const { registerUser, updateUserBalance, getAllUsers } = require("../controllers/userController");

exports.registerUser = async (req, res) => {
  try {
    const { phone, password, confirmPassword, invitationCode } = req.body;

    // Validate required fields
    if (!phone || !password || !invitationCode) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check invitation code
    const validCode = await InvitationCode.findOne({ code: invitationCode });
    if (!validCode) {
      return res.status(400).json({ message: 'Invalid invitation code.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered.' });
    }

    // 🌐 Get IP and Country
const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

let country = 'Unknown';
try {
  const geo = await axios.get(`https://ipapi.co/${ip}/json/`);
  country = geo.data.country_name || 'Unknown';
} catch (error) {
  console.log('🌐 Could not fetch IP country:', error.message);
}

    // 👤 Create user
const newUser = await User.create({
  phone,
  password,
  confirmPassword,
  invitationCode,
  ipAddress: ip,
  ipCountry: country
});

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateUserBalance = async (req, res) => {
  try {
    const { userId, newBalance } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.balance = newBalance;
    await user.save();

    res.status(200).json({ message: "Balance updated", balance: user.balance });
  } catch (err) {
    console.error("⚠️ Update Balance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "phone balance ipAddress ipCountry createdAt");
    res.json(users);
  } catch (err) {
    console.error("❌ Get Users Error:", err);
    res.status(500).json({ message: "Failed to get users" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate fields
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required." });
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    // Check password
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password." });
    }

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        phone: user.phone,
        balance: user.balance,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

const User = require('../models/User');
const InvitationCode = require('../models/InvitationCode');
const axios = require('axios');


function getVipRank(amount) {
  if (amount >= 5000) return "Gold";
  if (amount >= 300) return "Silver";
  return "Bronze";
}

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
    const { userId, depositAmount } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Add deposit to balance
    user.balance += depositAmount;

    // ✅ Check if this deposit upgrades their VIP level
    if (depositAmount > user.highestSingleDeposit) {
      user.highestSingleDeposit = depositAmount;
      user.vipRank = getVipRank(depositAmount);
    }

    await user.save();

    res.status(200).json({
      message: "Balance updated",
      balance: user.balance,
      vipRank: user.vipRank,
      highestSingleDeposit: user.highestSingleDeposit,
    });
  } catch (err) {
    console.error("⚠️ Update Balance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find(
      {},
      "phone balance vipRank ipAddress ipCountry createdAt orderCount"
    );
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

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      user: {
        id: user._id,
        phone: user.phone,
        balance: user.balance,
        vipRank: user.vipRank,
        highestSingleDeposit: user.highestSingleDeposit,
        ipAddress: user.ipAddress,
        ipCountry: user.ipCountry,
        orderCount: user.orderCount,
        createdAt: user.createdAt,
        trialBonus: user.trialBonus,
      }
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.updateUserVipRank = async (req, res) => {
  try {
    const { userId, vipRank } = req.body;

    const allowedRanks = ["Bronze", "Silver", "Gold"];
    if (!allowedRanks.includes(vipRank)) {
      return res.status(400).json({ message: "Invalid VIP rank." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.vipRank = vipRank;
    await user.save();

    res.status(200).json({
      message: "VIP rank updated successfully.",
      vipRank: user.vipRank,
    });
  } catch (err) {
    console.error("⚠️ Update VIP Rank Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    const { userId, phone, password, vipRank } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (phone) user.phone = phone;
    if (password && password.trim() !== "") {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (vipRank) user.vipRank = vipRank;

    await user.save();

    res.status(200).json({ message: "User updated successfully." });
  } catch (err) {
    console.error("⚠️ Update User Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.resetUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.orderCount = 0;
    await user.save();

    res.json({ success: true, message: "User order count has been reset." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.addTrialBonus = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.trialBonus.amount = amount;
    user.trialBonus.isActive = true;
    user.trialBonus.status = "active";

    await user.save();

    res.status(200).json({
      message: "Trial bonus added/updated successfully.",
      trialBonus: user.trialBonus,
    });
  } catch (err) {
    console.error("⚠️ Add Trial Bonus Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.cancelTrialBonus = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.trialBonus.isActive = false;
    user.trialBonus.amount = 0;
    user.trialBonus.status = "cancelled";

    await user.save();

    res.status(200).json({
      message: "Trial bonus cancelled successfully.",
      trialBonus: user.trialBonus,
    });
  } catch (err) {
    console.error("⚠️ Cancel Trial Bonus Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

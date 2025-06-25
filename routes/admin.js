const express = require("express");
const router = express.Router();
const AdminUser = require("../models/AdminUser");

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    const admin = await AdminUser.findOne({ phone, password });
    if (!admin || !admin.isAdmin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ message: "Login successful", adminId: admin._id });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

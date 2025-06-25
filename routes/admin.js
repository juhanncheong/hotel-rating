const express = require("express");
const router = express.Router();
const AdminUser = require("../models/AdminUser");

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    const admin = await AdminUser.findOne({ phone });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.password !== password) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      adminId: admin._id,
      isAdmin: admin.isAdmin,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;

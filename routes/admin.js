const express = require("express");
const router = express.Router();
const AdminUser = require("../models/AdminUser");
const { updateUserVipRank } = require("../controllers/userController");
const { adminUpdateUser } = require("../controllers/userController");
const { createHotel, getAllHotels } = require("../controllers/hotelController");

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    const admin = await AdminUser.findOne({ phone });

    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    if (admin.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      admin: {
        id: admin._id,
        phone: admin.phone,
        isAdmin: admin.isAdmin
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/update-vip-rank", updateUserVipRank);
router.post("/update-user", adminUpdateUser);
router.post("/hotels", createHotel);
router.get("/hotels", getAllHotels);

module.exports = router;

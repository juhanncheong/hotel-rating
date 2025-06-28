const express = require('express');
const router = express.Router();
const { 
  registerUser,
  loginUser,
  updateUserBalance,
  getAllUsers,
  getUserById
} = require("../controllers/userController");
const { getRandomHotel } = require("../controllers/hotelController");
const { createOrder } = require("../controllers/orderController");

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post("/admin/update-balance", updateUserBalance);
router.get("/admin/users", getAllUsers);
router.get("/random-hotel", getRandomHotel);
router.post("/orders", createOrder);

// ✅ Dynamic :id route goes LAST
router.get("/:id", getUserById);

module.exports = router;

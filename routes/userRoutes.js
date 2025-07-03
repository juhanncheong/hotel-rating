const express = require('express');
const router = express.Router();
const { 
  registerUser,
  loginUser,
  updateUserBalance,
  getAllUsers,
  getUserById,
  addTrialBonus,
  cancelTrialBonus
} = require("../controllers/userController");
const { getRandomHotel } = require("../controllers/hotelController");
const { startOrder, submitOrder, getUserOrderCount, getTodayProfit, getTodayOrderCount } = require("../controllers/orderController");

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post("/admin/update-balance", updateUserBalance);
router.get("/admin/users", getAllUsers);
router.get("/random-hotel", getRandomHotel);
router.post("/start-order", startOrder);
router.post("/submit-order", submitOrder);
router.get("/orders-count", getUserOrderCount);
router.get("/today-count/:userId", getTodayOrderCount);
router.get("/:userId/today-profit", require("../controllers/orderController").getTodayProfit);
router.post("/user/:id/trial-bonus", addTrialBonus);
router.patch("/user/:id/trial-bonus/cancel", cancelTrialBonus);
router.post("/trial-bonus", addTrialBonus);

// ✅ Dynamic :id route goes LAST
router.get("/:id", getUserById);

module.exports = router;

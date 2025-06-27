const express = require('express');
const router = express.Router();
const { 
  registerUser,
  loginUser,
  updateUserBalance,
  getAllUsers,
  getUserById
} = require("../controllers/userController");

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post("/admin/update-balance", updateUserBalance);
router.get("/admin/users", getAllUsers);
router.get("/:id", getUserById);

module.exports = router;

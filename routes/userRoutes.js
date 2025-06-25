const express = require('express');
const router = express.Router();
const { registerUser, updateUserBalance, getAllUsers } = require("../controllers/userController");

// Route for registration
router.post('/register', registerUser);
router.post("/admin/update-balance", updateUserBalance);
router.get("/admin/users", getAllUsers);

module.exports = router;

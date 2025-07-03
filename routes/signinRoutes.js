const express = require("express");
const router = express.Router();

const signinController = require("../controllers/signinController");

// GET /api/signin/status
router.get("/status", signinController.getSignInStatus);
router.post("/claim", signinController.claimSignInReward);

module.exports = router;

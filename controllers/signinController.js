const SignInReward = require("../models/SignInReward");
const User = require("../models/User");
const Order = require("../models/Order");

exports.getSignInStatus = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    // Find user's sign-in record
    let record = await SignInReward.findOne({ userId });

    if (!record) {
      // If no record yet, create one
      record = await SignInReward.create({
        userId,
        currentDay: 1,
        claimedDays: []
      });
    }

    // Check if user already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const claimedToday = record.lastClaimDate
      ? record.lastClaimDate >= today
      : false;

    // Check today's order count
    const nowUtc = new Date();
    const etOffsetMinutes = -240;
    const nowEt = new Date(nowUtc.getTime() + etOffsetMinutes * 60000);

    const startEt = new Date(nowEt);
    startEt.setHours(0, 0, 0, 0);

    const endEt = new Date(startEt);
    endEt.setDate(endEt.getDate() + 1);

    const startUtc = new Date(startEt.getTime() - etOffsetMinutes * 60000);
    const endUtc = new Date(endEt.getTime() - etOffsetMinutes * 60000);

    const todayOrderCount = await Order.countDocuments({
      userId,
      createdAt: { $gte: startUtc, $lt: endUtc }
    });

    // For simplicity, let’s hardcode your 5-day rewards:
    const rewardsList = [20, 30, 50, 100, 150];
    const dayIndex = record.currentDay - 1;
    const rewardAmount = rewardsList[dayIndex] || 0;

    return res.json({
      currentDay: record.currentDay,
      claimedToday,
      rewardAmount,
      todayOrderCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching sign-in status." });
  }
};

exports.claimSignInReward = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    // Find user's sign-in record
    let record = await SignInReward.findOne({ userId });

    if (!record) {
      record = await SignInReward.create({
        userId,
        currentDay: 1,
        claimedDays: []
      });
    }

    // Check if already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyClaimed = record.lastClaimDate
      ? record.lastClaimDate >= today
      : false;

    if (alreadyClaimed) {
      return res.status(400).json({
        success: false,
        message: "Reward already claimed today."
      });
    }

    // Check today's order count
    const nowUtc = new Date();
    const etOffsetMinutes = -240;
    const nowEt = new Date(nowUtc.getTime() + etOffsetMinutes * 60000);

    const startEt = new Date(nowEt);
    startEt.setHours(0, 0, 0, 0);

    const endEt = new Date(startEt);
    endEt.setDate(endEt.getDate() + 1);

    const startUtc = new Date(startEt.getTime() - etOffsetMinutes * 60000);
    const endUtc = new Date(endEt.getTime() - etOffsetMinutes * 60000);

    const todayOrderCount = await Order.countDocuments({
      userId,
      createdAt: { $gte: startUtc, $lt: endUtc }
    });

    if (todayOrderCount < 60) {
      return res.status(400).json({
        success: false,
        message: `You must complete at least 60 orders today to claim the reward.`
      });
    }

    // Define rewards array (your business logic)
    const rewardsList = [20, 30, 50, 100, 150];
    const dayIndex = record.currentDay - 1;
    const rewardAmount = rewardsList[dayIndex] || 0;

    // Add record for today
    record.claimedDays.push({
      day: record.currentDay,
      dateClaimed: new Date(),
      amount: rewardAmount
    });

    record.lastClaimDate = new Date();

    // Advance streak
    if (record.currentDay < 5) {
      record.currentDay += 1;
    } else {
      // Finished Day 5
      record.currentDay = 1;
    }

    await record.save();

    // Optionally: add reward to user balance
    const user = await User.findById(userId);
    user.balance += rewardAmount;
    await user.save();

    return res.json({
      success: true,
      reward: rewardAmount,
      newDay: record.currentDay
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error during claiming reward."
    });
  }
};

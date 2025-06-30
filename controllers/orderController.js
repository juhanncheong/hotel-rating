const Order = require("../models/Order");
const Hotel = require("../models/Hotel");
const Settings = require("../models/Settings");
const User = require("../models/User");

exports.createOrder = async (req, res) => {
  try {
    const { userId, hotelId } = req.body;

    // ✅ Fetch user
    const User = require("../models/User");
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Fetch hotel
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "Hotel not found" });
    }

// ✅ Get user's reset date (default to old date if never reset)
const resetDate = user.orderResetAt || new Date(0);

// ✅ Count only orders placed after reset date
const orderCount = await Order.countDocuments({
  userId,
  createdAt: { $gte: resetDate }
});

if (orderCount >= 30) {
  return res.status(400).json({
    success: false,
    message: "You have reached the maximum number of 30 orders. Please contact customer service.",
  });
}

    // ✅ Check user balance
    if (user.balance < hotel.price) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient balance. Please contact customer service.",
      });
    }

    // ✅ Deduct hotel price
    user.balance -= hotel.price;

    // ✅ Get commission rate from Settings
    const setting = await Settings.findOne({ key: "commissionRate" });
    const commissionRate = setting ? setting.value : 0;

    // ✅ Calculate commission
    const commission = (hotel.price * commissionRate) / 100;

    // ✅ Refund price + commission
    user.balance += hotel.price + commission;

    // ✅ Increment order count
    user.orderCount += 1;

    // ✅ Save updated user balance
    await user.save();

    // ✅ Create the order
    const order = await Order.create({
      userId,
      hotelId,
      price: hotel.price,
      commission,
    });

    // ✅ Return success response
    return res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error creating order",
    });
  }
};

exports.getUserOrderCount = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId parameter",
      });
    }

    const User = require("../models/User");
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const resetDate = user.orderResetAt || new Date(0);

    const orderCount = await Order.countDocuments({
      userId,
      createdAt: { $gte: resetDate }
    });

    return res.json({
      success: true,
      count: orderCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching order count",
    });
  }
};

exports.getTodayProfit = async (req, res) => {
  try {
    const userId = req.params.userId;

    // calculate ET midnight boundaries
    const now = new Date();

    // convert to ET timezone
    const offset = -4; // EDT
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const etDate = new Date(utc + (offset * 3600000));

    // get today's midnight in ET
    etDate.setHours(0, 0, 0, 0);
    const start = new Date(etDate);

    etDate.setHours(23, 59, 59, 999);
    const end = new Date(etDate);

    const todayOrders = await Order.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    });

    let totalProfit = 0;

    for (const order of todayOrders) {
      totalProfit += order.commission || 0;
    }

    res.json({
      success: true,
      todayProfit: totalProfit.toFixed(2),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate today's profit.",
    });
  }
};
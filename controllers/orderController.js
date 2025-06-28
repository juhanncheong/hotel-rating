const Order = require("../models/Order");
const Hotel = require("../models/Hotel");
const Settings = require("../models/Settings");

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

    // ✅ Check if user already reached 30 orders
const orderCount = await Order.countDocuments({ userId });

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

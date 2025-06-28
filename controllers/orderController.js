const Order = require("../models/Order");
const Hotel = require("../models/Hotel");
const Settings = require("../models/Settings");

exports.createOrder = async (req, res) => {
  try {
    const { userId, hotelId } = req.body;

    // Find the hotel
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "Hotel not found" });
    }

    // Get commission rate from Settings
    const setting = await Settings.findOne({ key: "commissionRate" });
    const commissionRate = setting ? setting.value : 0;

    // Calculate commission
    const commission = (hotel.price * commissionRate) / 100;

    // Create the order
    const order = await Order.create({
      userId,
      hotelId,
      price: hotel.price,
      commission,
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error creating order" });
  }
};

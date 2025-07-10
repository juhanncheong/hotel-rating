const Order = require("../models/Order");
const Hotel = require("../models/Hotel");
const Settings = require("../models/Settings");
const User = require("../models/User");
const mongoose = require("mongoose");

exports.getUserOrderCount = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId parameter",
      });
    }

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

    const nowUtc = new Date();

    const etOffsetMinutes = -240;
    const nowEt = new Date(nowUtc.getTime() + etOffsetMinutes * 60000);

    const startEt = new Date(nowEt);
    startEt.setHours(0, 0, 0, 0);

    const endEt = new Date(startEt);
    endEt.setDate(endEt.getDate() + 1);

    const startUtc = new Date(startEt.getTime() - etOffsetMinutes * 60000);
    const endUtc = new Date(endEt.getTime() - etOffsetMinutes * 60000);

    const todayOrders = await Order.find({
      userId,
      createdAt: { $gte: startUtc, $lt: endUtc },
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

exports.startOrder = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Determine reset date
    const resetDate = user.orderResetAt || new Date(0);

    // Count completed orders
    const completedCount = await Order.countDocuments({
      userId,
      status: "completed",
      createdAt: { $gte: resetDate },
    });

    const nextOrderNumber = completedCount + 1;

    // Check for commercial assignment
    const commercial = await CommercialAssignment.findOne({
      userId,
      orderNumber: nextOrderNumber,
      status: "pending",
    }).populate("hotelId");

    if (commercial && commercial.status === "pending") {
      // Check if there's already a pending commercial order
      const pendingOrder = await Order.findOne({
        userId,
        hotelId: commercial.hotelId._id,
        status: "pending",
      });

      if (pendingOrder) {
        const hotel = commercial.hotelId;

        hotel.price = commercial.price;
        hotel.commercialPrice = commercial.price;
        hotel.commercialAssignmentId = commercial._id;
        hotel.orderId = pendingOrder._id;

        return res.json({
          success: true,
          orderId: pendingOrder._id,
          hotel,
          pendingAmount: pendingOrder.pendingAmount,
        });
      }

      // No pending order yet → create one
      const setting = await Settings.findOne({ key: "commissionRate" });
      const commissionRate = setting ? setting.value : 0;
      const commission = (commercial.price * commissionRate) / 100;
      const pendingAmount = commercial.price + commission;

      user.balance -= commercial.price;
      await user.save();

      const newPendingOrder = await Order.create({
        userId,
        hotelId: commercial.hotelId._id,
        price: commercial.price,
        commission,
        pendingAmount,
        status: "pending",
        assignmentType: "commercial",
        orderNumber: nextOrderNumber,
      });

      const hotel = commercial.hotelId;
      hotel.price = commercial.price;
      hotel.commercialPrice = commercial.price;
      hotel.commercialAssignmentId = commercial._id;
      hotel.orderId = newPendingOrder._id;

      return res.json({
        success: true,
        orderId: newPendingOrder._id,
        hotel,
        pendingAmount,
      });
    }

    // ✅ Otherwise → proceed with normal order logic
    let balance;
    if (user.trialBonus?.isActive) {
      balance = user.trialBonus.amount;
    } else {
      balance = user.balance;
    }

    if (balance <= 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance to start an order. Please recharge.",
      });
    }

    // Check for pending normal order
    const existingPendingOrder = await Order.findOne({
      userId,
      status: "pending",
    }).populate("hotelId");

    if (existingPendingOrder) {
      return res.json({
        success: true,
        hotel: existingPendingOrder.hotelId,
        orderId: existingPendingOrder._id,
        pendingAmount: existingPendingOrder.pendingAmount,
      });
    }

    // Proceed with normal order matching
    const minPrice = balance * 0.8;
    const maxPrice = balance;

    const lastOrders = await Order.find({
      userId,
      status: "completed",
    }).sort({ createdAt: -1 }).limit(3);

    const recentlyUsedHotelIds = lastOrders.map(order => String(order.hotelId));

    let hotels = await Hotel.find({
      _id: { $nin: recentlyUsedHotelIds },
      price: { $gte: minPrice, $lte: maxPrice },
    });

    if (hotels.length === 0) {
      hotels = await Hotel.find({
        _id: { $nin: recentlyUsedHotelIds },
        price: { $lte: balance },
      });
    }

    if (hotels.length === 0) {
      hotels = await Hotel.find({
        price: { $lte: balance },
      });
    }

    const randomIndex = Math.floor(Math.random() * hotels.length);
    const hotel = hotels[randomIndex];

    const setting = await Settings.findOne({ key: "commissionRate" });
    const commissionRate = setting ? setting.value : 0;
    const commission = (hotel.price * commissionRate) / 100;
    const pendingAmount = hotel.price + commission;

    user.balance -= hotel.price;
    await user.save();

    const pendingOrder = await Order.create({
      userId,
      hotelId: hotel._id,
      price: hotel.price,
      commission,
      pendingAmount,
      status: "pending",
      assignmentType: "normal",
      orderNumber: nextOrderNumber,
    });

    return res.json({
      success: true,
      orderId: pendingOrder._id,
      hotel,
      pendingAmount,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error starting order.",
    });
  }
};

exports.submitOrder = async (req, res) => {
  try {
    const { userId, orderId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const order = await Order.findById(orderId).populate("hotelId");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Order has already been completed.",
      });
    }

    // Check if user has sufficient funds to unlock the pending order
    if (user.balance + order.pendingAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient funds. Please recharge before completing this order.",
      });
    }

    // ✅ Refund pendingAmount ONCE (price + commission)
    user.balance += order.pendingAmount;

    // Increment order count
    user.orderCount += 1;

    // Disable trial bonus if reached 30 orders
    if (user.trialBonus?.isActive && user.orderCount >= 30) {
      user.trialBonus.isActive = false;
      user.trialBonus.status = "completed";
      user.trialBonus.amount = 0;
    }

    // Clear pending
    order.pendingAmount = 0;
    user.pending = 0;

    order.status = "completed";

    await order.save();
    await user.save();

    return res.json({
      success: true,
      message: "Order completed successfully!",
      order,
      hotel: order.hotelId,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error submitting order."
    });
  }
};

exports.getTodayOrderCount = async (req, res) => {
  try {
    const userId = req.params.userId;

    const nowUtc = new Date();

    const etOffsetMinutes = -240; // Eastern Time offset
    const nowEt = new Date(nowUtc.getTime() + etOffsetMinutes * 60000);

    const startEt = new Date(nowEt);
    startEt.setHours(0, 0, 0, 0);

    const endEt = new Date(startEt);
    endEt.setDate(endEt.getDate() + 1);

    const startUtc = new Date(startEt.getTime() - etOffsetMinutes * 60000);
    const endUtc = new Date(endEt.getTime() - etOffsetMinutes * 60000);

    const count = await Order.countDocuments({
      userId,
      createdAt: { $gte: startUtc, $lt: endUtc },
    });

    return res.json({
      success: true,
      todayOrderCount: count,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching today's order count.",
    });
  }
};

const CommercialAssignment = require("../models/CommercialAssignment");

exports.assignCommercialHotel = async (req, res) => {
  try {
    const { userId, orderNumber, hotelId, price } = req.body;

    // Here you’d extract adminId from token/session:
    const assignedByAdminId = req.adminId || null;

    let existing = await CommercialAssignment.findOne({
      userId,
      orderNumber,
    });

    if (existing) {
      // Update existing assignment
      existing.hotelId = hotelId;
      existing.price = price;
      existing.assignedByAdminId = assignedByAdminId;
      existing.assignedAt = new Date();
      await existing.save();
    } else {
      // Create new assignment
      await CommercialAssignment.create({
        userId,
        orderNumber,
        hotelId,
        price,
        assignedByAdminId,
        assignedAt: new Date(),
      });
    }

    return res.json({
      success: true,
      message: "Commercial assignment saved.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error saving commercial assignment.",
    });
  }
};

exports.getCommercialAssignmentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const assignments = await CommercialAssignment.find({ userId })
      .populate('hotelId', 'name price'); // populate hotel name & price

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching assignments.' });
  }
};

exports.deleteCommercialAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const deleted = await CommercialAssignment.findByIdAndDelete(assignmentId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    res.json({
      success: true,
      message: "Commercial assignment deleted.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting commercial assignment.",
    });
  }
};

exports.getCommercialAssignmentForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find ANY pending commercial assignment regardless of order number
const resetDate = user.orderResetAt || new Date(0);

const completedCount = await Order.countDocuments({
  userId,
  status: "completed",
  createdAt: { $gte: resetDate }
});

const nextOrderNumber = completedCount + 1;


const assignment = await CommercialAssignment.findOne({
  userId: new mongoose.Types.ObjectId(userId),
  orderNumber: nextOrderNumber,
  status: "pending",
}).populate("hotelId");

    if (!assignment) {
      return res.json({ assignment: null });
    }

res.json({
  assignment: {
    _id: assignment._id,
    hotelId: assignment.hotelId._id,
    hotelName: assignment.hotelId.name,
    hotelCountry: assignment.hotelId.country,
    hotelPhotoUrl: assignment.hotelId.photoUrl,
    hotelDescription: assignment.hotelId.description,
    price: assignment.price,
    orderNumber: assignment.orderNumber,
    pendingAmount,
  }
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching commercial assignment" });
  }
};

exports.submitCommercialAssignment = async (req, res) => {
  try {
    const { userId, assignmentId, orderId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetDate = user.orderResetAt || new Date(0);

    const userOrderCount = await Order.countDocuments({
      userId,
      createdAt: { $gte: resetDate },
    });

    if (userOrderCount >= 30) {
      return res.status(403).json({
        success: false,
        message: "You have reached your maximum number of orders for today. Please upgrade your account.",
      });
    }

    const assignment = await CommercialAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Commercial assignment not found" });
    }

    const pendingOrder = await Order.findById(orderId);
    if (!pendingOrder) {
      return res.status(404).json({
        message: "No pending commercial order found for this user.",
      });
    }

    // ✅ NEW: Check if user's balance is negative
    if (user.balance < 0) {
      return res.status(400).json({
        success: false,
        message: "Congratulations, you received a commercial assignment.",
      });
    }

    // ✅ Refund pendingAmount ONCE (hotel price + commission)
    user.balance += pendingOrder.pendingAmount;

    // Increment order count
    user.orderCount += 1;

    // Clear user's pending status
    user.pending = 0;

    // Disable trial bonus if reached 30 orders
    if (user.trialBonus?.isActive && user.orderCount >= 30) {
      user.trialBonus.isActive = false;
      user.trialBonus.status = "completed";
      user.trialBonus.amount = 0;
    }

    // Update order
    pendingOrder.status = "completed";
    pendingOrder.pendingAmount = 0;
    await pendingOrder.save();

    // Update commercial assignment
    assignment.status = "completed";
    assignment.pendingAmount = 0;
    await assignment.save();

    await user.save();

    return res.json({
      success: true,
      message: "Commercial order completed successfully.",
      orderId: pendingOrder._id,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting commercial assignment" });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // compute next order number
const resetDate = user.orderResetAt || new Date(0);

const completedCount = await Order.countDocuments({
  userId,
  status: "completed",
  createdAt: { $gte: resetDate }
});

const nextOrderNumber = completedCount + 1;


    // check commercial assignment for next order
    const assignment = await CommercialAssignment.findOne({
      userId: user._id,
      orderNumber: nextOrderNumber,
      status: "pending",
    });

    let pendingAmount = 0;

    if (assignment) {
      const setting = await Settings.findOne({ key: "commissionRate" });
      const commissionRate = setting ? setting.value : 0;
      const commission = (assignment.price * commissionRate) / 100;
      pendingAmount = assignment.price + commission;
    }

return res.json({
  success: true,
  user: {
    id: user._id,
    phone: user.phone,
    balance: user.balance,
    orderCount: user.orderCount,
    pendingAmount,
    nextOrderNumber,
  }
});

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching user info.",
    });
  }
};
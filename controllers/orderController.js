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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    
    let balance;
    if (user.trialBonus?.isActive) {
      balance = user.trialBonus.amount;
    } else {
      balance = user.balance;
    }

    // ✅ Check if the user already has a pending order
    const existingPendingOrder = await Order.findOne({
      userId,
      status: "pending"
    }).populate("hotelId");

    if (existingPendingOrder) {
      return res.json({
        success: true,
        hotel: existingPendingOrder.hotelId,
        orderId: existingPendingOrder._id,
      });
    }

// ✅ STEP 1: determine next order number
const completedCount = await Order.countDocuments({
  userId,
  status: "completed",
});

const nextOrderNumber = user.orderCount + 1;

// ✅ STEP 2: check commercial assignment
const commercial = await CommercialAssignment.findOne({
  userId,
  orderNumber: nextOrderNumber,
}).populate("hotelId");

if (commercial) {
  // ✅ STEP 3: handle commercial assignment
  const hotel = commercial.hotelId;

  const pendingOrder = await Order.create({
    userId,
    hotelId: hotel._id,
    price: commercial.price,
    commission: 0,
    status: "pending",
    assignmentType: "commercial",
    orderNumber: nextOrderNumber,
  });

  // ✅ adjust user balance — allow negative
  user.balance -= commercial.price;
  await user.save();

hotel.price = commercial.price;
hotel.commercialPrice = commercial.price;
hotel.commercialAssignmentId = commercial._id;
hotel.orderId = pendingOrder._id;

return res.json({
  success: true,
  orderId: pendingOrder._id,
  hotel,
});
}

// ✅ Otherwise, proceed with normal order flow...


    const tolerance = 0.10;
    const minPrice = balance * (1 - tolerance);
    const maxPrice = balance;

    let hotels = await Hotel.find({
     price: { $gte: minPrice, $lte: maxPrice }
   });

   // ✅ fallback to hotels user can actually afford
   if (hotels.length === 0) {
     hotels = await Hotel.find({
      price: { $lte: balance }
    });
   }

   if (hotels.length === 0) {
     return res.status(404).json({
       success: false,
       message: "No hotels available.",
     });
   }

    const randomIndex = Math.floor(Math.random() * hotels.length);
    const hotel = hotels[randomIndex];

const pendingOrder = await Order.create({
  userId,
  hotelId: hotel._id,
  price: hotel.price,
  commission: 0,
  status: "pending",
  assignmentType: "normal",
  orderNumber: nextOrderNumber,
});

    return res.json({
      success: true,
      orderId: pendingOrder._id,
      hotel
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

    // We’ll add full logic next.

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

const hotel = order.hotelId;

// Check affordability
if (user.trialBonus?.isActive && user.trialBonus.amount >= hotel.price) {
  // Trial balance logic
  user.trialBonus.amount -= hotel.price;

  // Get commission rate
  const setting = await Settings.findOne({ key: "commissionRate" });
  const commissionRate = setting ? setting.value : 0;
  const commission = (hotel.price * commissionRate) / 100;

  user.balance += commission;

  user.trialBonus.amount += hotel.price;

  user.orderCount += 1;

  if (user.orderCount >= 30) {
    user.trialBonus.isActive = false;
    user.trialBonus.status = "completed";
    user.trialBonus.amount = 0;
  }

  order.commission = commission;
  order.status = "completed";
  await user.save();
  await order.save();

  return res.json({
    success: true,
    order,
    hotel
  });

} else {
  // Real balance logic
if (order.assignmentType !== "commercial") {
  if (user.balance < hotel.price) {
    return res.status(400).json({
      success: false,
      message: "Insufficient real balance for this hotel.",
    });
  }
}

  user.balance -= hotel.price;

  const setting = await Settings.findOne({ key: "commissionRate" });
  const commissionRate = setting ? setting.value : 0;
  const commission = (hotel.price * commissionRate) / 100;

  user.balance += hotel.price + commission;

  user.orderCount += 1;

  if (user.trialBonus.isActive && user.orderCount >= 30) {
    user.trialBonus.isActive = false;
    user.trialBonus.status = "completed";
    user.trialBonus.amount = 0;
  }

  order.commission = commission;
  order.status = "completed";
  await user.save();
  await order.save();

  return res.json({
    success: true,
    order,
    hotel
  });
}

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
    const assignment = await CommercialAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      assignedByAdminId: null,  // only fetch unclaimed assignments
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
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching commercial assignment" });
  }
};

exports.submitCommercialAssignment = async (req, res) => {
  try {
    const { userId, assignmentId } = req.body;

    // find the commercial assignment
    const assignment = await CommercialAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Commercial assignment not found" });
    }

    // Check user's balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.balance < assignment.price) {
      return res.status(400).json({
        message: "Insufficient balance. Please recharge to proceed.",
      });
    }

    // Create new Order
    const order = new Order({
      userId: user._id,
      hotelId: assignment.hotelId,
      price: assignment.price,
      commission: assignment.price * 0.005,
      status: "completed",
      orderType: "commercial",
    });

    await order.save();

    // Deduct user balance
    user.balance -= assignment.price;
    user.orderCount += 1;
    await user.save();

    // Optionally mark assignment as done
    assignment.assignedByAdminId = "completed";
    await assignment.save();

    return res.json({
      success: true,
      orderId: order._id,
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
    const nextOrderNumber = user.orderCount + 1;

    // check commercial assignment for next order
    const assignment = await CommercialAssignment.findOne({
      userId: user._id,
      orderNumber: nextOrderNumber,
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
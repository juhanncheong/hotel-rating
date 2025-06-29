const Settings = require("../models/Settings");

exports.getCommissionRate = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "commissionRate" });

    res.json({
      success: true,
      commissionRate: setting ? setting.value : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching commission rate",
    });
  }
};

exports.updateCommissionRate = async (req, res) => {
  try {
    const { commissionRate } = req.body;

    if (commissionRate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing commissionRate in request body",
      });
    }

    const updatedSetting = await Settings.findOneAndUpdate(
      { key: "commissionRate" },
      { value: commissionRate },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      commissionRate: updatedSetting.value,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error updating commission rate",
    });
  }
};

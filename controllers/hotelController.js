const Hotel = require("../models/Hotel");

// ✅ Admin creates a hotel
exports.createHotel = async (req, res) => {
  try {
    const { name, photoUrl, description, country, price } = req.body;
    const hotel = await Hotel.create({
       name,
       photoUrl,
       description,
       country,
       price
    });
    res.json({ success: true, hotel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating hotel" });
  }
};

// ✅ Admin gets all hotels
exports.getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find();
    res.json({ success: true, hotels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching hotels" });
  }
};

// ✅ Admin updates a hotel
exports.updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, photoUrl, description, country, price } = req.body;

    const hotel = await Hotel.findByIdAndUpdate(
      id,
      { name, photoUrl, description, country, price },
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    res.json({ success: true, hotel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating hotel" });
  }
};

// ✅ Admin deletes a hotel
exports.deleteHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const hotel = await Hotel.findByIdAndDelete(id);

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    res.json({ success: true, message: "Hotel deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error deleting hotel" });
  }
};

// ✅ User fetches a random hotel
exports.getRandomHotel = async (req, res) => {
  try {
    const hotels = await Hotel.find();
    if (hotels.length === 0) {
      return res.status(404).json({ success: false, message: "No hotels found" });
    }
    const randomIndex = Math.floor(Math.random() * hotels.length);
    const randomHotel = hotels[randomIndex];
    res.json({ success: true, hotel: randomHotel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching hotel" });
  }
};


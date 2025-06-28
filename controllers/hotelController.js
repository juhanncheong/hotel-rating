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

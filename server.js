const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const InvitationCode = require('./models/InvitationCode');
const app = express();
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require("./routes/admin");

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use("/api", adminRoutes);
app.use("/api/user", require("./routes/userRoutes"));

// Example route
app.get('/', (req, res) => {
  res.send('Hotel Rating API is running...');
});

// Start server and connect to DB
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})
})
.catch((err) => console.error('MongoDB connection error:', err));

// TEMP: create first invitation code if not exists
const createFirstInviteCode = async () => {
  const existing = await InvitationCode.findOne({ code: 'NEFT999' });
  if (!existing) {
    await InvitationCode.create({ code: 'NEFT999' });
    console.log('✅ First invitation code NEFT999 created');
  } else {
    console.log('ℹ️ Invitation code NEFT999 already exists');
  }
};

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  await createFirstInviteCode(); // <-- run this once
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})
.catch((err) => console.error('MongoDB connection error:', err));
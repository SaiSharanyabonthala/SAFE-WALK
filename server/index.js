const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// PORT CONFIGURATION (CRITICAL FOR RENDER)
const PORT = process.env.PORT || 10000; 

// Ensure uploads folder exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// SECURE TOKENS (Using Environment Variables)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8637140116:AAEVke8aMDF4P6-jMMQDdbNuxyT6EiFwhK0'; 
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://saidevbonthala_db_user:e2J77pe0t1Ayr6H7@cluster17.ovxrdvo.mongodb.net/rakshanet?retryWrites=true&w=majority";

// Initialize Bot with error handling for the 409 Conflict
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
    console.log("⚠️ Telegram Bot conflict detected. Ensure only one instance is running.");
  } else {
    console.error("Bot Polling Error:", error.code);
  }
});

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ SafeWalk Cloud DB Connected!"))
  .catch(err => console.error("❌ DB Connection Error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: String,
  emergencyContactPhone: String,
  telegramChatId: { type: Number, default: null },
  isConnected: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Link Telegram Bot
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const usernameFromLink = match; // Corrected index for regex match
  const updatedUser = await User.findOneAndUpdate(
    { username: usernameFromLink },
    { telegramChatId: chatId, isConnected: true },
    { new: true }
  );
  if (updatedUser) {
    bot.sendMessage(chatId, `💜 <b>Connected to SafeWalk!</b>\n\nYou will receive SOS alerts for <b>${usernameFromLink}</b>.`, { parse_mode: 'HTML' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { username, email, contact } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username, email, emergencyContactPhone: contact });
      await user.save();
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// ROUTE: Send Location Alert
app.post('/api/sos', async (req, res) => {
  const { userId, latitude, longitude } = req.body;
  const user = await User.findOne({ username: userId });
  if (user && user.telegramChatId) {
    const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message = `🚨 <b>SOS ALERT: ${userId.toUpperCase()}</b> 🚨\n\nI am in danger! Track me here:\n📍 ${mapLink}`;
    await bot.sendMessage(user.telegramChatId, message, { parse_mode: 'HTML' });
    res.status(200).json({ success: true });
  } else {
    res.status(404).json({ error: "Contact not connected via Telegram." });
  }
});

// ROUTE: Receive Video and Forward to Telegram
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    const { userId } = req.body;
    const filePath = req.file.path;
    const user = await User.findOne({ username: userId });

    if (user && user.telegramChatId) {
      await bot.sendVideo(user.telegramChatId, filePath, {
        caption: `📽️ SOS Emergency Recording from ${userId}`
      });
      console.log(`✅ Recording for ${userId} sent to Telegram!`);
      // Delete local file after sending to save space on Render
      fs.unlinkSync(filePath); 
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Recording process failed:", err);
    res.status(500).json({ error: "Failed to process recording" });
  }
});

// Use 0.0.0.0 to allow Render to bind to the port
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
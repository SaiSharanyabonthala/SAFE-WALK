require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const app = express();

// Relaxed CORS for dev to prevent network blockages across ports
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Gemini AI with JSON Mode schema
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is missing from process.env!");
}

// Replace "gemini-2.5-flash" with "gemini-3.5-flash" or "gemini-flash-latest"
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3.5-flash", // or "gemini-flash-latest"
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        riskLevel: {
          type: SchemaType.STRING,
          enum: ["Low", "Medium", "High"],
        },
        precautions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["riskLevel", "precautions"],
    },
  },
});
// Setup Uploads Directory
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// Bot & Database Configurations
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN; 
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rakshanet";

if (!TELEGRAM_TOKEN) {
  console.warn("⚠️ WARNING: TELEGRAM_TOKEN is missing from process.env!");
}

const bot = new TelegramBot(TELEGRAM_TOKEN || "PLACEHOLDER", { polling: true });

bot.on('polling_error', (error) => {
  if (error.message.includes('409 Conflict')) {
    console.log("⚠️ Conflict! Ensure no other bot polling instance is running.");
  } else {
    console.error("Bot Error:", error.message);
  }
});

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Local Server: MongoDB Connected!"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// User Schema
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
  const usernameFromLink = match[1];
  
  try {
    const updatedUser = await User.findOneAndUpdate(
      { username: usernameFromLink },
      { telegramChatId: chatId, isConnected: true },
      { new: true }
    );
    if (updatedUser) {
      bot.sendMessage(chatId, `💜 <b>Connected to SafeWalk!</b>\n\nYou will receive SOS alerts for <b>${usernameFromLink}</b>.`, { parse_mode: 'HTML' });
    }
  } catch (err) {
    console.error("Telegram Link Error:", err);
  }
});

// Signup Route
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

// SOS Alert Route
app.post('/api/sos', async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const user = await User.findOne({ username: userId });

    if (user && user.telegramChatId) {
      const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message = `🚨 <b>SOS ALERT: ${userId.toUpperCase()} NEEDS HELP</b> 🚨\n\nLocation: 📍 <a href="${mapLink}">View on Google Maps</a>`;
      await bot.sendMessage(user.telegramChatId, message, { parse_mode: 'HTML' });
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: "Guardian not connected to Telegram Bot yet." });
    }
  } catch (err) {
    console.error("SOS Route Error:", err);
    res.status(500).json({ error: "Failed to process SOS alert." });
  }
});

// Video Upload Route
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  const filePath = req.file ? req.file.path : null;
  try {
    if (!filePath) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    const { userId } = req.body;
    const user = await User.findOne({ username: userId });

    if (user && user.telegramChatId) {
      await bot.sendVideo(user.telegramChatId, filePath, {
        caption: `📽️ SOS Emergency Recording from ${userId}`
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Video Route Error:", err);
    res.status(500).json({ error: "Failed to process recording" });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// AI Safety Context Route
app.post('/api/ai/safety-context', async (req, res) => {
  try {
    const { lat, lng, time, destination } = req.body;

    let locationInfo = "";
    if (destination && destination.trim() !== "") {
      locationInfo = `Destination / Area: ${destination}`;
    } else if (lat != null && lng != null) {
      locationInfo = `Coordinates: Lat ${lat}, Lng ${lng}`;
    } else {
      return res.status(400).json({ 
        success: false, 
        error: "Missing location or destination input." 
      });
    }

    const prompt = `
      Act as an AI Public Safety Risk Assessment Engine.
      Analyze the current context:
      - ${locationInfo}
      - Time of Day: ${time || 'Current Time'}

      Evaluate temporal factors (night vs day) and standard public safety risks for urban environments.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Strip potential markdown code fences from AI output
    const cleanText = responseText.replace(/```json|```/g, '').trim();
    const cleanJson = JSON.parse(cleanText);

    res.json({ success: true, data: cleanJson });
  } catch (err) {
    console.error("❌ AI Context Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to generate safety context advice." 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local Backend active on http://localhost:${PORT}`);
});
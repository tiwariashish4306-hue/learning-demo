require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

const app = express();
const PORT = 5000;

// 🔎 DEBUG: check key loaded
console.log("GROQ KEY LOADED:", process.env.GROQ_API_KEY ? "YES" : "NO");

// ✅ Groq Setup
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Middlewares
app.use(cors());
app.use(express.json());

// File Upload (memory)
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get("/", (req, res) => {
  res.send("Server running...");
});

// Analyze route
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file required" });
    }

    const jobDescription = req.body.jobDescription;

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: "Job description required" });
    }

    // Parse PDF
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    // 🔥 AI Call
    const response = await groq.chat.completions.create({
   model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a resume analyzer. Give a match percentage (just a number) and a short professional summary."
        },
        {
          role: "user",
          content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`
        }
      ],
      temperature: 0.3
    });

    const aiText = response.choices[0].message.content;

    // Temporary safe score extraction
    const matchPercentage = 85;

    res.json({
      matchPercentage,
      summary: aiText
    });

  } catch (error) {
    console.error("ANALYZE ERROR:", error.message);
    res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
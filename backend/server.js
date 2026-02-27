require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

const app = express();
const PORT = 5000;

console.log("GROQ KEY LOADED:", process.env.GROQ_API_KEY ? "YES" : "NO");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.send("Server running...");
});

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume required" });
    }

    const jobDescription = req.body.jobDescription;
    if (!jobDescription) {
      return res.status(400).json({ error: "Job description required" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
You are an advanced ATS-level resume analyzer.

Return ONLY valid JSON in this format:

{
  "matchScore": number,
  "reasoning": "Detailed explanation",
  "strengths": [],
  "missingSkills": [],
  "improvementSuggestions": []
}
          `,
        },
        {
          role: "user",
          content: `
Resume:
${resumeText}

Job Description:
${jobDescription}
          `,
        },
      ],
    });

    const aiText = completion.choices[0].message.content;

    // ✅ Safe JSON extraction
    let parsed;
    try {
      const jsonStart = aiText.indexOf("{");
      const jsonEnd = aiText.lastIndexOf("}");
      const cleanJson = aiText.substring(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      console.log("RAW AI RESPONSE:", aiText);
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: aiText,
      });
    }

    // ✅ Success response
    res.json(parsed);

  } catch (error) {
    console.error("ERROR:", error.message);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
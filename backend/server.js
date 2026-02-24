const express = require("express");
const multer = require("multer");
const cors = require("cors");
require("dotenv").config();

const fs = require("fs");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ---------------- MULTER CONFIG ----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
});

// ---------------- HEALTH CHECK ROUTE ----------------
app.get("/", (req, res) => {
  res.json({ message: "AI Resume Backend API Running 🚀" });
});

// ---------------- MAIN ANALYSIS API ----------------
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const jobDescription = req.body.jobDescription || "";

    if (!jobDescription.trim()) {
      return res.status(400).json({ error: "Job description is required" });
    }

    const filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);

    const resumeText = pdfData.text.toLowerCase();
    const jdText = jobDescription.toLowerCase();

    // ---------------- LENGTH SCORE (30) ----------------
    const wordCount = resumeText.split(/\s+/).length;

    let lengthScore = 0;
    if (wordCount < 150) {
      lengthScore = 10;
    } else if (wordCount < 300) {
      lengthScore = 20;
    } else {
      lengthScore = 30;
    }

    // ---------------- SKILL MATCH ----------------
    const skills = [
      "react",
      "node",
      "mongodb",
      "express",
      "javascript",
      "python",
      "java",
      "sql",
      "html",
      "css"
    ];

    let matchedSkills = [];
    let missingSkills = [];

    skills.forEach(skill => {
      if (jdText.includes(skill)) {
        if (resumeText.includes(skill)) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    });

    const totalRequiredSkills = matchedSkills.length + missingSkills.length;

    const matchPercentage =
      totalRequiredSkills === 0
        ? 0
        : Math.round((matchedSkills.length / totalRequiredSkills) * 100);

    const skillScore = Math.round((matchPercentage / 100) * 50);

    // ---------------- SECTION SCORE (20) ----------------
    let sectionScore = 0;

    if (resumeText.includes("education")) sectionScore += 5;
    if (resumeText.includes("experience") || resumeText.includes("work")) sectionScore += 5;
    if (resumeText.includes("skills")) sectionScore += 5;
    if (resumeText.includes("objective") || resumeText.includes("summary")) sectionScore += 5;

    // ---------------- FINAL SCORE (100) ----------------
    const totalScore = skillScore + lengthScore + sectionScore;

    // Clean uploaded file
    fs.unlinkSync(filePath);

    // ---------------- FINAL RESPONSE ----------------
    res.json({
      totalScore,
      matchPercentage,
      breakdown: {
        skillScore,
        lengthScore,
        sectionScore
      },
      matchedSkills,
      missingSkills
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Something went wrong during resume analysis"
    });
  }
});

app.get("/form", (req, res) => {
  res.send(`
    <h2>AI Resume Analyzer</h2>
    <form action="/analyze" method="POST" enctype="multipart/form-data">
      <label>Upload Resume (PDF):</label><br/>
      <input type="file" name="resume" required /><br/><br/>

      <label>Job Description:</label><br/>
      <textarea name="jobDescription" rows="6" cols="60" required></textarea><br/><br/>

      <button type="submit">Analyze Resume</button>
    </form>
  `);
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

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

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Only allow PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// Home Route
app.get("/", (req, res) => {
  res.send("AI Resume Backend Running 🚀");
});

// Simple Form UI
app.get("/form", (req, res) => {
  res.send(`
    <h2>Resume Analyzer</h2>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="resume" required />
      <br/><br/>
      <textarea name="jobDescription" rows="6" cols="50" placeholder="Paste Job Description here" required></textarea>
      <br/><br/>
      <button type="submit">Analyze Resume</button>
    </form>
  `);
});

// Upload + Resume Analysis
app.post("/upload", upload.single("resume"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const jobDescription = req.body.jobDescription || "";

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

    // ---------------- SKILL MATCH LOGIC ----------------
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

    // Skill score out of 50
    const skillScore = Math.round((matchPercentage / 100) * 50);

    // ---------------- SECTION SCORE (20) ----------------
    let sectionScore = 0;

    if (resumeText.includes("education")) sectionScore += 5;
    if (resumeText.includes("experience") || resumeText.includes("work")) sectionScore += 5;
    if (resumeText.includes("skills")) sectionScore += 5;
    if (resumeText.includes("objective") || resumeText.includes("summary")) sectionScore += 5;

    // ---------------- FINAL TOTAL SCORE (100) ----------------
    const totalScore = skillScore + lengthScore + sectionScore;

    // Delete uploaded file after processing
    fs.unlinkSync(filePath);

    res.send(`
      <h2>Resume Analysis Result</h2>

      <h3>Overall Resume Score: ${totalScore}/100</h3>

      <h3>Match Percentage: ${matchPercentage}%</h3>

      <h3>Matched Skills ✅</h3>
      <ul>
        ${matchedSkills.map(skill => `<li style="color:green">${skill}</li>`).join("")}
      </ul>

      <h3>Missing Skills ❌</h3>
      <ul>
        ${missingSkills.map(skill => `<li style="color:red">${skill}</li>`).join("")}
      </ul>

      <br/>
      <a href="/form">Analyze Another Resume</a>
    `);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
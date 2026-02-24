import { useState } from "react";
import "./App.css";

function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !jobDescription) {
      alert("Please upload resume and paste job description");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobDescription", jobDescription);

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="card">
        <h1>AI Resume Analyzer</h1>

        {/* Upload Resume */}
        <label className="file-label">
          {file ? `Selected: ${file.name}` : "Click to Upload Resume"}
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {/* Job Description */}
        <textarea
          placeholder="Paste Job Description..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        {/* Analyze Button */}
        <button onClick={handleSubmit}>
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>

        {/* Result Section */}
        {result && (
          <div style={{ marginTop: "15px", color: "white" }}>
            <h3>Match Score: {result.matchPercentage}%</h3>
            <p>{result.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
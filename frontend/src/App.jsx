
import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!file || !jobDescription) {
      alert("Upload resume and paste job description");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="app">
      <div className="card">
        <h1>AI Resume Analyzer</h1>

        <label className="file-label">
          {file ? file.name : "Click to Upload Resume"}
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            hidden
          />
        </label>

        <textarea
          placeholder="Paste Job Description..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>

        {error && <p className="error">{error}</p>}

        {result && (
          <div className="result">
            <h2>Match Score: {result.matchScore}%</h2>
            <p><strong>Reasoning:</strong> {result.reasoning}</p>

            <h3>Strengths</h3>
            <ul>
              {result.strengths?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>

            <h3>Missing Skills</h3>
            <ul>
              {result.missingSkills?.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>

            <h3>Improvement Suggestions</h3>
            <ul>
              {result.improvementSuggestions?.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
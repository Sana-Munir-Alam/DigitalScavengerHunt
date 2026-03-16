import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/BossLevel.css";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function BossLevel() {
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName");
  const trailType = sessionStorage.getItem("trailType");

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [penalty, setPenalty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("Loading mission briefing...");

  useEffect(() => {
    if (!teamName) navigate("/login");
    // Fetch boss description from DB
    if (trailType) {
      axios.get(`${API_URL}/api/boss/description/${trailType}`)
        .then((res) => setDescription(res.data.description || "No briefing available."))
        .catch(() => setDescription("Unable to load mission briefing."));
    }
  }, [teamName, trailType, navigate]);

  // Poll for game-ended status — redirect if admin ends game while on boss level
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await axios.get(`/api/user/${teamName}`);
        if (res.data.gameEnded) {
          clearInterval(poll);
          if (res.data.SafeStatus) {
            navigate("/success");
          } else {
            navigate("/failure");
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [teamName, navigate]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/boss/submit`, { teamName, answer });
      if (res.data.success) {
        setResult({ type: "correct", message: "✓ MISSION COMPLETE! Redirecting..." });
        setTimeout(() => navigate("/success"), 2000);
      } else {
        setPenalty((p) => p + 0.1);
        setResult({ type: "wrong", message: "✗ INCORRECT — Penalty applied. Try again." });
      }
    } catch (err) {
      setResult({ type: "wrong", message: "Submission error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bl-page">
      <div className="bl-grid-bg" />
      <div className="bl-scan-line" />

      <header className="bl-header">
        <button className="bl-back-btn" onClick={() => navigate("/puzzle-room")}>
          ← RETURN
        </button>
        <div className="bl-header-title">⚠ BOSS LEVEL — CLASSIFIED</div>
        <div style={{ width: 80 }} />
      </header>

      <div className="bl-content">
        <div className="bl-title">
          <span className="bl-main-title">FINAL DIRECTIVE</span>
          <span className="bl-sub-title">TRAIL: {trailType?.toUpperCase()} — TERMINAL CHALLENGE</span>
        </div>

        <div className="bl-puzzle-box">
          <span className="bl-puzzle-label">Mission Briefing</span>
          <div className="bl-puzzle-desc">{description}</div>

          <div className="bl-form">
            <label className="bl-input-label">Final Answer</label>
            <input
              className="bl-input"
              type="text"
              placeholder="ENTER FINAL ANSWER..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
              autoComplete="off"
            />
            <button className="bl-submit-btn" onClick={handleSubmit} disabled={loading}>
              <span>{loading ? "VERIFYING..." : "SUBMIT FINAL ANSWER"}</span>
            </button>

            {result && (
              <div className={`bl-result ${result.type}`}>{result.message}</div>
            )}
            {penalty > 0 && (
              <div className="bl-penalty">Total penalties: -{penalty.toFixed(1)} pts</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/BossLevel.css";

const BOSS_DESCRIPTIONS = {
  Red: "FINAL DIRECTIVE — RED TRAIL: A digital phoenix rises from encrypted ashes. Your trail has led you through ciphers, networks, and physical landmarks. The final answer is the mythical creature reborn from fire that guides the Red Trail. Provide the codename: [Trailname]+[Creature]. Answer: REDPHOENIX",
  Green: "FINAL DIRECTIVE — GREEN TRAIL: Ancient serpents guard the secrets of the deep digital forest. Your trail has woven through binary forests and physical summits. The answer is your trail color followed by the legendary serpentine beast. Answer: GREENDRAGON",
  Blue: "FINAL DIRECTIVE — BLUE TRAIL: A master of the skies, swift and precise. Your trail soared through packets and spectral wonders. The final code is your trail color followed by the aerial predator. Answer: BLUEFALCON",
};

export default function BossLevel() {
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName");
  const trailType = sessionStorage.getItem("trailType");

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [penalty, setPenalty] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamName) navigate("/login");
  }, [teamName, navigate]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/boss/submit", { teamName, answer });
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
          <div className="bl-puzzle-desc">
            {BOSS_DESCRIPTIONS[trailType] || BOSS_DESCRIPTIONS["Red"]}
          </div>

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
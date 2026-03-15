import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/SuccessPage.css";

const COLORS = ["#00ff88", "#00e5ff", "#ffaa00", "#ff4466", "#aaff00"];

function Confetti() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: `${2 + Math.random() * 3}s`,
      delay: `${Math.random() * 2}s`,
      size: `${4 + Math.random() * 8}px`,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
    }));
    setParticles(p);
  }, []);

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="sp-confetti-particle"
          style={{
            left: p.left,
            top: "-20px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.borderRadius,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  );
}

function formatSubmissionTime(seconds) {
  if (!seconds) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function SuccessPage() {
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!teamName) { navigate("/login"); return; }
    axios.get(`/api/user/${teamName}`).then((res) => setUserData(res.data)).catch(() => {});
  }, [teamName, navigate]);

  return (
    <div className="sp-page">
      <div className="sp-bg" />
      <div className="sp-scan" />
      <Confetti />

      <div className="sp-content">
        <div className="sp-icon">✅</div>

        <div className="sp-title">Mission Complete</div>
        <div className="sp-subtitle">
          OPERATIVE {teamName} — OBJECTIVE ACHIEVED
        </div>

        {userData && (
          <div className="sp-stats-card">
            <div className="sp-stat">
              <span className="sp-stat-label">Team</span>
              <span className="sp-stat-value">{userData.TeamName}</span>
            </div>
            <div className="sp-stat">
              <span className="sp-stat-label">Trail</span>
              <span className="sp-stat-value">{userData.TrailType}</span>
            </div>
            <div className="sp-stat">
              <span className="sp-stat-label">Final Score</span>
              <span className="sp-stat-value highlight">{userData.TotalScore?.toFixed(1)}</span>
            </div>
            <div className="sp-stat">
              <span className="sp-stat-label">Submission Time</span>
              <span className="sp-stat-value">{formatSubmissionTime(userData.FinalSubmissionTime)}</span>
            </div>
            <div className="sp-stat">
              <span className="sp-stat-label">Penalties</span>
              <span className="sp-stat-value">{userData.Penalty?.toFixed(1)}</span>
            </div>
          </div>
        )}

        <div className="sp-actions">
          <button className="sp-btn sp-btn-primary" onClick={() => navigate("/leaderboard")}>
            ◈ View Leaderboard
          </button>
          <button className="sp-btn sp-btn-secondary" onClick={() => navigate("/home")}>
            ← Home
          </button>
        </div>
      </div>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import "../styles/FailurePage.css";

export default function FailurePage() {
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName");

  return (
    <div className="fp-page">
      <div className="fp-bg" />
      <div className="fp-scan" />

      <div className="fp-content">
        <div className="fp-icon">☠</div>
        <div className="fp-title">Mission Failed</div>
        <div className="fp-subtitle">OPERATIVE {teamName} — OBJECTIVE NOT ACHIEVED</div>

        <div className="fp-message">
          Time has expired. The trail has gone cold. Your digital footprints have been erased from the system.
          The mission clock reached zero before the final objective was secured.
          <br /><br />
          All intelligence gathered has been archived. Your team's performance has been logged in the records.
        </div>

        <div className="fp-actions">
          <button className="fp-btn fp-btn-primary" onClick={() => navigate("/leaderboard")}>
            ◈ View Results
          </button>
          <button className="fp-btn fp-btn-secondary" onClick={() => navigate("/home")}>
            ← Home Base
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/LeaderBoard.css";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatTime(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function LeaderBoard() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = sessionStorage.getItem("role");

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get("/api/leaderboard");
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const top3 = teams.slice(0, 3);
  const rest = teams.slice(3);

  const goBack = () => {
    if (role === "admin") navigate("/admin");
    else navigate("/home");
  };

  return (
    <div className="lb-page">
      <div className="lb-bg-grid" />

      <header className="lb-header">
        <button className="lb-back-btn" onClick={goBack}>← BACK</button>
        <div className="lb-header-title">Leaderboard</div>
        <div className="lb-live-badge">● LIVE</div>
      </header>

      <div className="lb-content">
        {loading ? (
          <div className="lb-empty">LOADING INTELLIGENCE...</div>
        ) : teams.length === 0 ? (
          <div className="lb-empty">NO TEAMS REGISTERED YET</div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 1 && (
              <div className="lb-podium">
                {[1, 0, 2].map((idx) => {
                  const team = top3[idx];
                  if (!team) return <div key={idx} />;
                  const realRank = idx + 1;
                  return (
                    <div key={idx} className={`lb-podium-card rank-${realRank}`}>
                      <span className="lb-rank-medal">{MEDALS[realRank - 1]}</span>
                      <span className="lb-podium-team">{team.teamName}</span>
                      <div className="lb-podium-score">{team.totalScore.toFixed(1)}</div>
                      <div className="lb-podium-trail">{team.trailType}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="lb-table-title">Full Rankings</div>
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="lb-th">Rank</th>
                  <th className="lb-th">Team</th>
                  <th className="lb-th">Trail</th>
                  <th className="lb-th">Score</th>
                  <th className="lb-th">Puzzles</th>
                  <th className="lb-th">Submitted</th>
                  <th className="lb-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, i) => (
                  <tr
                    key={team.teamName}
                    className={`lb-tr ${i < 3 ? "top-3" : ""}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <td className="lb-td">
                      <span className={`lb-rank-num ${i < 3 ? "rank-top" : ""}`}>
                        {i < 3 ? MEDALS[i] : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="lb-td">
                      <span className="lb-team-name">{team.teamName}</span>
                    </td>
                    <td className="lb-td">
                      <span className={`lb-trail-tag ${team.trailType}`}>{team.trailType}</span>
                    </td>
                    <td className="lb-td">
                      <span className="lb-score-cell">{team.totalScore.toFixed(1)}</span>
                    </td>
                    <td className="lb-td">{team.totalSolved}</td>
                    <td className="lb-td" style={{ fontSize: "11px" }}>
                      {team.finalSubmissionTime ? formatTime(team.finalSubmissionTime) : "—"}
                    </td>
                    <td className="lb-td">
                      {team.safeStatus && <span className="lb-safe-tag">✓ SAFE</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
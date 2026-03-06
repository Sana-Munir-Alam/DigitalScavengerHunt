import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminPanelPage.css";

function indicatorClass(status) {
  if (status === 0) return "locked";
  if (status === 1) return "unlocked";
  if (status === 2) return "correct";
  if (status === 3) return "wrong";
  return "locked";
}

function formatMinSec(totalSeconds) {
  if (!totalSeconds) return "--";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSubmit(seconds) {
  if (!seconds) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${m}m`;
}

// Team Card Component
function TeamCard({ user, index }) {
  const techStatuses = user.TechPuzzleStatusArray || Array(8).fill(0);
  const physStatuses = user.PhysicalPuzzleStatus || Array(5).fill(0);
  const techTimes = user.TechPuzzleTime || Array(8).fill(0);
  const physTimes = user.PhysicalPuzzleTime || Array(5).fill(0);

  return (
    <div
      className={`ap-team-card ${user.TrailType}-trail`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="ap-card-header">
        <span className="ap-card-teamname">{user.TeamName}</span>
        <span className={`ap-card-trail ${user.TrailType}`}>{user.TrailType}</span>
      </div>

      <div className="ap-card-score">{user.TotalScore?.toFixed(1) || "0.0"}</div>
      <div className="ap-card-submit">
        {user.FinalSubmissionTime ? `✓ ${formatSubmit(user.FinalSubmissionTime)}` : user.SafeStatus ? "✓ SAFE" : "In Progress"}
      </div>

      {/* Tech indicators */}
      <div className="ap-puzzle-section">
        <span className="ap-puzzle-label">Tech Hunt</span>
        <div className="ap-indicators">
          {techStatuses.map((status, i) => (
            <div
              key={i}
              className={`ap-indicator ${indicatorClass(status)}`}
              title={`Puzzle ${i + 1} — ${["Locked","Unlocked","Correct","Wrong"][status] || "Unknown"} ${status === 2 ? `(${formatMinSec(techTimes[i])})` : ""}`}
            >
              {status === 2 ? formatMinSec(techTimes[i]) : status === 3 ? "✗" : status === 1 ? "!" : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Physical indicators */}
      <div className="ap-puzzle-section">
        <span className="ap-puzzle-label">Scavenger</span>
        <div className="ap-indicators">
          {physStatuses.map((status, i) => (
            <div
              key={i}
              className={`ap-indicator ${indicatorClass(status)}`}
              title={`Physical ${i + 1} — ${["Locked","Unlocked","Correct","Wrong"][status] || "Unknown"} ${status === 2 ? `(${formatMinSec(physTimes[i])})` : ""}`}
            >
              {status === 2 ? formatMinSec(physTimes[i]) : status === 3 ? "✗" : status === 1 ? "!" : i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Create User Modal
function CreateUserModal({ adminUser, adminPass, onClose, onSuccess }) {
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [trailType, setTrailType] = useState("Red");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!teamName || !password) {
      setResult({ type: "error", message: "All fields required." });
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/admin/create-user", {
        username: adminUser,
        password: adminPass,
        teamName,
        userPassword: password,
        trailType,
      });
      setResult({ type: "success", message: `Team "${teamName.toUpperCase()}" created.` });
      setTeamName("");
      setPassword("");
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setResult({ type: "error", message: err.response?.data?.message || "Failed to create user." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <button className="ap-modal-close" onClick={onClose}>✕</button>
        <div className="ap-modal-title">Create Team</div>
        <div className="ap-form">
          <div className="ap-form-field">
            <label className="ap-form-label">Team Name</label>
            <input
              className="ap-form-input"
              type="text"
              placeholder="ENTER TEAM NAME"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="ap-form-field">
            <label className="ap-form-label">Password</label>
            <input
              className="ap-form-input"
              type="password"
              placeholder="SET PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="ap-form-field">
            <label className="ap-form-label">Trail Type</label>
            <select
              className="ap-form-select"
              value={trailType}
              onChange={(e) => setTrailType(e.target.value)}
            >
              <option value="Red">Red</option>
              <option value="Green">Green</option>
              <option value="Blue">Blue</option>
            </select>
          </div>
          <button className="ap-form-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "CREATING..." : "CREATE TEAM"}
          </button>
          {result && (
            <div className={`ap-form-result ${result.type}`}>{result.message}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const adminUser = sessionStorage.getItem("adminUser");
  const adminPass = sessionStorage.getItem("adminPass");

  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`/api/admin/users?username=${adminUser}&password=${adminPass}`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [adminUser, adminPass]);

  useEffect(() => {
    if (!adminUser) { navigate("/login"); return; }
    fetchUsers();
    const interval = setInterval(fetchUsers, 6000);
    return () => clearInterval(interval);
  }, [adminUser, navigate, fetchUsers]);

  const adminAction = async (endpoint, label) => {
    setLoading(true);
    setStatusMsg("");
    try {
      await axios.post(`/api/admin/${endpoint}`, { username: adminUser, password: adminPass });
      setStatusMsg(`✓ ${label} — success`);
      fetchUsers();
    } catch (err) {
      setStatusMsg(`✗ ${err.response?.data?.message || "Action failed"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  // Group by trail
  const redTeams = users.filter((u) => u.TrailType === "Red");
  const greenTeams = users.filter((u) => u.TrailType === "Green");
  const blueTeams = users.filter((u) => u.TrailType === "Blue");

  return (
    <div className="ap-page">
      <div className="ap-bg-grid" />

      {/* Header */}
      <header className="ap-header">
        <div className="ap-header-title">⚙ Admin Control Panel</div>
        <div className="ap-header-actions">
          <button className="ap-ctrl-btn blue" onClick={() => adminAction("initialize", "Initialize")}>
            INITIALIZE
          </button>
          <button className="ap-ctrl-btn green" onClick={() => setShowCreateModal(true)}>
            + CREATE USER
          </button>
          <button className="ap-ctrl-btn green" onClick={() => adminAction("start-game", "Game Started")}>
            ▶ START GAME
          </button>
          <button className="ap-ctrl-btn warn" onClick={() => adminAction("deactivate-game", "Deactivated")}>
            ⏸ DEACTIVATE
          </button>
          <button className="ap-ctrl-btn warn" onClick={() => adminAction("reset-timer", "Timer Reset")}>
            ↺ RESET TIMER
          </button>
          <button className="ap-ctrl-btn warn" 
            onClick={() => {
                if (window.confirm("Reset ALL team progress? This cannot be undone.")) {
                adminAction("reset-game", "Game Reset");
                }
            }}
            >
            ⟳ RESET GAME
            </button>
            <button className="ap-ctrl-btn red" 
            onClick={() => {
                if (window.confirm("DELETE EVERYTHING from the database? This cannot be undone.")) {
                adminAction("delete-everything", "DB Wiped");
                }
            }}
            >
            🗑 DELETE ALL
            </button>
          <button className="ap-ctrl-btn red" onClick={() => adminAction("end-game", "Game Ended")}>
            ■ END GAME
          </button>
          
          <button className="ap-ctrl-btn blue" onClick={() => navigate("/leaderboard")}>
            ◈ BOARD
          </button>
          <button className="ap-ctrl-btn ap-logout-btn" onClick={handleLogout}>
            ⏻ LOGOUT
          </button>
        </div>
      </header>

      {statusMsg && (
        <div style={{
          padding: "10px 28px",
          background: statusMsg.startsWith("✓") ? "rgba(0,255,136,0.08)" : "rgba(255,68,102,0.08)",
          borderBottom: "1px solid rgba(0,229,255,0.1)",
          color: statusMsg.startsWith("✓") ? "#00ff88" : "#ff4466",
          fontSize: "11px",
          letterSpacing: "2px",
          fontFamily: "var(--ap-font)",
          position: "relative",
          zIndex: 10,
        }}>
          {statusMsg}
        </div>
      )}

      <div className="ap-content">
        {users.length === 0 ? (
          <div style={{ color: "var(--ap-muted)", textAlign: "center", padding: "60px", fontSize: "12px", letterSpacing: "3px" }}>
            NO TEAMS REGISTERED — USE INITIALIZE + CREATE USER
          </div>
        ) : (
          <>
            {/* Red Trail */}
            {redTeams.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div className="ap-section-title" style={{ color: "rgba(255,85,85,0.7)" }}>
                  🔴 Red Trail — {redTeams.length} team{redTeams.length !== 1 ? "s" : ""}
                </div>
                <div className="ap-cards-grid">
                  {redTeams.map((user, i) => (
                    <TeamCard key={user.TeamName} user={user} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Green Trail */}
            {greenTeams.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div className="ap-section-title" style={{ color: "rgba(0,255,136,0.7)" }}>
                  🟢 Green Trail — {greenTeams.length} team{greenTeams.length !== 1 ? "s" : ""}
                </div>
                <div className="ap-cards-grid">
                  {greenTeams.map((user, i) => (
                    <TeamCard key={user.TeamName} user={user} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Blue Trail */}
            {blueTeams.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div className="ap-section-title" style={{ color: "rgba(0,229,255,0.7)" }}>
                  🔵 Blue Trail — {blueTeams.length} team{blueTeams.length !== 1 ? "s" : ""}
                </div>
                <div className="ap-cards-grid">
                  {blueTeams.map((user, i) => (
                    <TeamCard key={user.TeamName} user={user} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          adminUser={adminUser}
          adminPass={adminPass}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
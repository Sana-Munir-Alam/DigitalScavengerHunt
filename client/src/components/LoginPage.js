import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("participant");
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (userType === "admin") {
        const res = await axios.post("/api/admin/login", {
          username: teamName,
          password,
        });
        if (res.data.success) {
          sessionStorage.setItem("role", "admin");
          sessionStorage.setItem("adminUser", teamName);
          sessionStorage.setItem("adminPass", password);
          navigate("/loading", { state: { role: "admin" } });
        }
      } else {
        const res = await axios.post("/api/login", { teamName, password });
        if (res.data.success) {
          sessionStorage.setItem("role", "participant");
          sessionStorage.setItem("teamName", res.data.teamName);
          sessionStorage.setItem("trailType", res.data.trailType);
          navigate("/loading", { state: { role: "participant" } });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-bg-grid" />
      <div className="lp-scan-overlay" />

      <div className="lp-card">
        <div className="lp-corner-tl" />
        <div className="lp-corner-tr" />
        <div className="lp-corner-bl" />
        <div className="lp-corner-br" />

        <div className="lp-card-header">
          <span className="lp-logo-icon">🔐</span>
          <span className="lp-card-title">Secure Access</span>
          <span className="lp-card-sub">DIGITAL SCAVENGER HUNT — TERMINAL AUTH</span>
        </div>

        <div className="lp-tabs">
          <button
            className={`lp-tab ${userType === "participant" ? "active" : ""}`}
            onClick={() => { setUserType("participant"); setError(""); }}
          >
            Participant
          </button>
          <button
            className={`lp-tab ${userType === "admin" ? "active" : ""}`}
            onClick={() => { setUserType("admin"); setError(""); }}
          >
            Admin
          </button>
        </div>

        <form className="lp-form" onSubmit={handleLogin}>
          <div className="lp-field">
            <label className="lp-label">
              {userType === "admin" ? "Admin Username" : "Team Name"}
            </label>
            <input
              className="lp-input"
              type="text"
              placeholder={userType === "admin" ? "ENTER USERNAME" : "ENTER TEAM NAME"}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="lp-field">
            <label className="lp-label">Password</label>
            <input
              className="lp-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="lp-error">⚠ {error}</div>}

          <button className="lp-btn" type="submit" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "AUTHORIZE ACCESS"}
          </button>
        </form>
      </div>
    </div>
  );
}
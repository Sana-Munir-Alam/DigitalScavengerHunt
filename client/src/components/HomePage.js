import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/HomePage.css";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function formatTime(seconds) {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export default function HomePage() {
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName");
  const trailType = sessionStorage.getItem("trailType");

  const [timeRemaining, setTimeRemaining] = useState(7200);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStartEnabled, setGameStartEnabled] = useState(false);
  const [gameActive, setGameActive] = useState(false); // admin's GameActive flag
  const [loading, setLoading] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/user/${teamName}`);
      const data = res.data;
      setGameStartEnabled(data.GameStartStatus);
      setGameActive(data.gameActive);

      if (data.GameStartTime && data.gameActive) {
        // Game is actively running — sync server time
        setGameStarted(true);
        setTimeRemaining(data.timeRemaining);
      } else {
        // Admin deactivated / reset-game / end-game / reset-timer:
        // reset local state so timer shows 02:00:00 and stops ticking
        setGameStarted(false);
        setTimeRemaining(7200);
      }

      // If admin ended game — redirect all non-Home users
      // HomePage stays on HomePage intentionally, so we do NOT redirect here
    } catch (err) {
      console.error(err);
    }
  }, [teamName]);

  useEffect(() => {
    if (!teamName) { navigate("/login"); return; }
    fetchUserData();
    const poll = setInterval(fetchUserData, 5000);
    return () => clearInterval(poll);
  }, [teamName, navigate, fetchUserData]);

  // Countdown — only ticks when both gameStarted AND gameActive are true.
  // When admin deactivates/resets, gameActive flips false → cleanup fires,
  // killing the interval. fetchUserData also resets gameStarted to false.
  useEffect(() => {
    if (!gameStarted || !gameActive) return;
    const timer = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(timer);
          navigate("/home");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, gameActive, navigate]);

  const handleStartGame = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/user/start-game`, { teamName });
      setGameStarted(true);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot start game");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const isDanger = timeRemaining < 600;

  // "Enter Mission" is only active if game has started AND admin's game is still active
  const canEnterMission = gameStarted && gameActive;
  // "Start Game" button is active only if admin enabled it AND game is active
  const canStartGame = gameStartEnabled && gameActive && !gameStarted;

  return (
    <div className="hp-page">
      <div className="hp-bg-grid" />

      {/* Header */}
      <header className="hp-header">
        <button className="hp-logout-btn" onClick={handleLogout}>
          ⏻ LOGOUT
        </button>
        <div className="hp-team-display">
          <span className="hp-team-label">OPERATOR</span>
          <span className="hp-team-name">{teamName}</span>
          <span className={`hp-trail-badge ${trailType}`}>{trailType?.toUpperCase()} TRAIL</span>
        </div>
        <div className="hp-header-right">
          <span className={`hp-game-status ${gameStarted && gameActive ? "active" : "inactive"}`}>
            {gameStarted && gameActive ? "● MISSION ACTIVE" : gameStarted && !gameActive ? "⏸ PAUSED" : "○ STANDBY"}
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="hp-body">
        <div className="hp-title-section">
          <div className="hp-main-title">Digital Scavenger Hunt</div>
          <span className="hp-main-subtitle">DEVDAY 2026 — CLASSIFIED OPERATION</span>
        </div>

        <div className="hp-timer-box">
          <span className="hp-timer-label">Mission Timer</span>
          <div className={`hp-timer-value ${isDanger ? "danger" : ""}`}>
            {formatTime(timeRemaining).split("").map((ch, i) =>
              ch === ":" ? (
                <span key={i} className="hp-timer-colon">:</span>
              ) : (
                <span key={i}>{ch}</span>
              )
            )}
          </div>
          <span className="hp-timer-status">
            {gameStarted && gameActive ? "COUNTDOWN ACTIVE"
              : gameStarted && !gameActive ? "MISSION PAUSED BY ADMIN"
              : gameStartEnabled ? "READY — AWAITING START"
              : "PENDING ADMIN ACTIVATION"}
          </span>
        </div>

        <div className="hp-actions">
          {gameStarted ? (
            <button
              className="hp-btn-primary"
              onClick={() => navigate("/puzzle-room")}
              disabled={!canEnterMission}
              style={!canEnterMission ? { opacity: 0.4, cursor: "not-allowed" } : {}}
            >
              <span>{canEnterMission ? "▶ ENTER MISSION" : "⏸ MISSION PAUSED"}</span>
            </button>
          ) : (
            <button className="hp-btn-primary" onClick={handleStartGame} disabled={!canStartGame || loading}>
              <span>{loading ? "INITIALIZING..." : "▶ START GAME"}</span>
            </button>
          )}
          <button className="hp-btn-secondary" onClick={() => navigate("/leaderboard")}>
            ◈ LEADERBOARD
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="hp-footer">
        <a className="hp-rulebook-btn" href="/DSH_Rulebook.pdf" target="_blank" rel="noopener noreferrer">
          📋 RULEBOOK
        </a>
      </footer>
    </div>
  );
}
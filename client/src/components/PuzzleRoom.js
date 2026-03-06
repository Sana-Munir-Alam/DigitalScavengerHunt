import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/PuzzleRoom.css";

// Puzzle descriptions per trail
const PUZZLE_DESCRIPTIONS = {
  Red: {
    tech: [
      "A substitution method used in classical cryptography where each letter is replaced by another. Used in ancient Rome. What is this technique called? Answer: CIPHER",
      "The interconnected system of devices sharing data. Every device on the internet is part of this. A fundamental concept in IT. Answer: NETWORK",
      "A set of rules governing communication between devices. TCP/IP is an example. Without this, systems cannot communicate. Answer: PROTOCOL",
      "A security system that monitors and filters network traffic. Acts as the first line of digital defense. Answer: FIREWALL",
      "The process of converting readable data into an unreadable format. Requires a key to reverse. Essential for secure communication. Answer: ENCRYPT",
      "The data carried by a network packet — the actual message or malicious code embedded within. Answer: PAYLOAD",
      "Malicious software that gains privileged access to a computer system while hiding its presence. Answer: ROOTKIT",
      "An isolated environment for testing untrusted programs safely without affecting the host system. Answer: SANDBOX",
    ],
    physical: [
      "Find the board that displays the maze of the event venue. The shape it forms is the answer. Answer: LABYRINTH",
      "A navigational tool always pointing north. Find the physical one hidden in your zone. Answer: COMPASS",
      "An imaginary line running through the poles. The longitude of zero degrees. Answer: MERIDIAN",
      "Where the sky meets the earth visually. Find the marked zone that represents this boundary. Answer: HORIZON",
      "When the moon blocks the sun. A clue hidden in the astronomy exhibit. Answer: ECLIPSE",
    ],
  },
  Green: {
    tech: [
      "The base-2 numeral system using only 0s and 1s. The language of all computers. Answer: BINARY",
      "The core of the operating system. It manages communication between hardware and software. Answer: KERNEL",
      "A background process in Unix/Linux systems that starts automatically and runs continuously. Answer: DAEMON",
      "An endpoint for sending and receiving data across a network. Used in TCP/UDP communication. Answer: SOCKET",
      "A region of memory used to temporarily store data during transfers. An overflow here can crash systems. Answer: BUFFER",
      "A C function that dynamically allocates memory during runtime. Failure to free it causes leaks. Answer: MALLOC",
      "The smallest unit of execution within a process. Programs can run many of these simultaneously. Answer: THREAD",
      "A data structure that stores direction and magnitude. Also used in C++ STL for dynamic arrays. Answer: VECTOR",
    ],
    physical: [
      "A measurement of height above sea level. Find the sign showing this metric in the stairwell. Answer: ALTITUDE",
      "To move across a terrain — a hiking or mapping term. Find the physical route marked in your zone. Answer: TRAVERSE",
      "The highest point of a mountain or achievement. Look for the marked summit illustration. Answer: PINNACLE",
      "Moving downward from a height. Find the descending arrow path in the physical zone. Answer: DESCENT",
      "A watchful guardian or guard post. Find the standing figure or marked post in your zone. Answer: SENTINEL",
    ],
  },
  Blue: {
    tech: [
      "A unit of data transmitted over a network. Contains headers and a payload. Routers forward these. Answer: PACKET",
      "A networking device that forwards data packets between computer networks using routing tables. Answer: ROUTER",
      "A division of a network — IP addresses are grouped into these for better management. Answer: SUBNET",
      "The node in a network that routes traffic to other networks. Your home has one of these. Answer: GATEWAY",
      "A small piece of data stored by a browser that tracks session state. Can be stolen in XSS attacks. Answer: COOKIE",
      "Code embedded in a webpage that runs in the browser. Can be used for both functionality and attacks. Answer: SCRIPT",
      "A compromised computer in a botnet that obeys commands without the owner's knowledge. Answer: ZOMBIE",
      "Malware disguised as legitimate software that creates backdoors. Named after a Greek myth. Answer: TROJAN",
    ],
    physical: [
      "A violent rotating column of air. Find the spiral diagram in your physical zone. Answer: VORTEX",
      "Something that appears without a clear source — ghostly. Find the hidden marker in your zone. Answer: PHANTOM",
      "A central hub where systems or networks connect. Find the physical connection point in your zone. Answer: NEXUS",
      "The range of colors of light. Find the prism or color strip displayed in your zone. Answer: SPECTRUM",
      "An agent that triggers a reaction without being consumed. Find the chemical symbol display. Answer: CATALYST",
    ],
  },
};

const TECH_CODES = [
  "T1-001","T1-002","T1-003","T1-004",
  "T1-005","T1-006","T1-007","T1-008",
];

const PHY_CODES = ["S1-001","S1-002","S1-003","S1-004","S1-005"];

function formatTime(seconds) {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function formatRelTime(seconds) {
  if (!seconds && seconds !== 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusClass(status) {
  if (status === 0) return "locked";
  if (status === 1) return "unlocked";
  if (status === 2) return "correct";
  if (status === 3) return "wrong";
  return "";
}

function statusLabel(status) {
  if (status === 0) return "Locked";
  if (status === 1) return "Unlocked";
  if (status === 2) return "Complete";
  if (status === 3) return "Retry";
  return "";
}

// PUZZLE CARD
function PuzzleCard({ index, code, status, timeVal, onClick }) {
  const cls = statusClass(status);
  return (
    <div className={`pr-puzzle-card ${cls}`} onClick={onClick}>
      <div className="pr-card-top">
        <span className="pr-card-code">{code}</span>
        <span className="pr-card-index">#{(index + 1).toString().padStart(2, "0")}</span>
      </div>
      <div>
        <span className={`pr-status-badge ${cls}`}>{statusLabel(status)}</span>
        {status === 2 && timeVal > 0 && (
          <div className="pr-card-time">⏱ {formatRelTime(timeVal)}</div>
        )}
      </div>
    </div>
  );
}

// PUZZLE MODAL
function PuzzleModal({ puzzle, onClose, onSubmit, result }) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    onSubmit(answer);
  };

  return (
    <div className="pr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pr-modal">
        <button className="pr-modal-close" onClick={onClose}>✕</button>
        <div className="pr-modal-title">PUZZLE {puzzle.code}</div>
        <div className="pr-modal-code">Classification: ACTIVE CHALLENGE</div>
        <div className="pr-modal-desc">{puzzle.description}</div>

        {puzzle.status !== 2 && (
          <>
            <div className="pr-modal-input-group">
              <label className="pr-modal-label">Submit Answer</label>
              <input
                ref={inputRef}
                className="pr-modal-input"
                type="text"
                placeholder="TYPE YOUR ANSWER..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoComplete="off"
              />
            </div>
            <button className="pr-modal-submit" onClick={handleSubmit}>
              <span>SUBMIT ANSWER</span>
            </button>
          </>
        )}

        {result && (
          <div className={`pr-modal-result ${result.type === "correct" ? "correct-res" : "wrong-res"}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

// BOSS FLAG MODAL
function BossFlagModal({ onClose, onSuccess }) {
  const [flag, setFlag] = useState("");
  const [error, setError] = useState("");
  const teamName = sessionStorage.getItem("teamName");

  const handleSubmit = async () => {
    try {
      const res = await axios.post("/api/boss/verify-flag", { teamName, flagInput: flag });
      if (res.data.success) {
        onSuccess();
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError("Verification failed. Try again.");
    }
  };

  return (
    <div className="pr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pr-modal" style={{ borderColor: "var(--pr-accent)" }}>
        <button className="pr-modal-close" onClick={onClose}>✕</button>
        <div className="pr-modal-title" style={{ color: "var(--pr-accent)" }}>BOSS LEVEL ACCESS</div>
        <div className="pr-modal-code">Enter combined trail flag to proceed</div>
        <div className="pr-modal-desc" style={{ borderLeftColor: "var(--pr-accent)" }}>
          You must input the combined flag string collected throughout your trail. 
          The tech flag and physical flag concatenated together form the key.
        </div>
        <div className="pr-modal-input-group">
          <label className="pr-modal-label">Combined Flag String</label>
          <input
            className="pr-modal-input"
            type="text"
            placeholder="ENTER COMBINED FLAG..."
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoComplete="off"
          />
        </div>
        <button
          className="pr-modal-submit"
          style={{ borderColor: "var(--pr-accent)", color: "var(--pr-accent)" }}
          onClick={handleSubmit}
        >
          <span>VERIFY FLAG</span>
        </button>
        {error && (
          <div className="pr-modal-result wrong-res">⚠ {error}</div>
        )}
      </div>
    </div>
  );
}

export default function PuzzleRoom() {
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName");
  const trailType = sessionStorage.getItem("trailType");

  const [userData, setUserData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(7200);
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [activeType, setActiveType] = useState(null); // "tech" | "physical"
  const [modalResult, setModalResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [showBossModal, setShowBossModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`/api/user/${teamName}`);
      setUserData(res.data);
      setTimeRemaining(res.data.timeRemaining);
    } catch (err) {
      console.error(err);
    }
  }, [teamName]);

  useEffect(() => {
    if (!teamName) { navigate("/login"); return; }
    fetchData();
    const poll = setInterval(fetchData, 8000);
    return () => clearInterval(poll);
  }, [teamName, navigate, fetchData]);

  // Live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(timer);
          navigate("/failure");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const openPuzzle = (index, type) => {
    const statusArr = type === "tech"
      ? userData?.TechPuzzleStatusArray
      : userData?.PhysicalPuzzleStatus;

    if (!statusArr) return;
    const status = statusArr[index];
    if (status === 0) return; // locked

    // If wrong status, retry first
    if (status === 3) {
      handleRetry(index, type);
      return;
    }

    const descriptions = PUZZLE_DESCRIPTIONS[trailType];
    const desc = type === "tech"
      ? descriptions?.tech?.[index]
      : descriptions?.physical?.[index];

    const code = type === "tech" ? TECH_CODES[index] : PHY_CODES[index];

    setActivePuzzle({ index, code, description: desc, status });
    setActiveType(type);
    setModalResult(null);
  };

  const handleRetry = async (index, type) => {
    try {
      const endpoint = type === "tech"
        ? "/api/puzzle/tech/retry"
        : "/api/puzzle/physical/retry";
      await axios.post(endpoint, { teamName, puzzleIndex: index });
      await fetchData();
      // Re-open modal after retry
      const descriptions = PUZZLE_DESCRIPTIONS[trailType];
      const desc = type === "tech"
        ? descriptions?.tech?.[index]
        : descriptions?.physical?.[index];
      const code = type === "tech" ? TECH_CODES[index] : PHY_CODES[index];
      setActivePuzzle({ index, code, description: desc, status: 1 });
      setActiveType(type);
      setModalResult(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (answer) => {
    if (!activePuzzle) return;

    const endpoint = activeType === "tech"
      ? "/api/puzzle/tech/submit"
      : "/api/puzzle/physical/submit";

    try {
      const res = await axios.post(endpoint, {
        teamName,
        puzzleIndex: activePuzzle.index,
        answer,
      });

      if (res.data.result === "correct" || res.data.result === "already_solved") {
        setModalResult({ type: "correct", message: "✓ CORRECT — Puzzle solved! +10 points" });
        showToast("✓ CORRECT! +10 pts", "correct-toast");
        await fetchData();
        setTimeout(() => setActivePuzzle(null), 1500);
      } else {
        setModalResult({ type: "wrong", message: "✗ INCORRECT — Penalty -0.1 applied. Click card to retry." });
        showToast("✗ WRONG ANSWER — Penalty applied", "wrong-toast");
        await fetchData();
        setTimeout(() => setActivePuzzle(null), 1800);
      }
    } catch (err) {
      setModalResult({ type: "wrong", message: err.response?.data?.message || "Submission error" });
    }
  };

  const handleBossSuccess = () => {
    setShowBossModal(false);
    navigate("/boss-level");
  };

  const isDanger = timeRemaining < 600;
  const techStatuses = userData?.TechPuzzleStatusArray || [1, 0, 0, 0, 0, 0, 0, 0];
  const physStatuses = userData?.PhysicalPuzzleStatus || [0, 0, 0, 0, 0];
  const techTimes = userData?.TechPuzzleTime || Array(8).fill(0);
  const physTimes = userData?.PhysicalPuzzleTime || Array(5).fill(0);
  const scavengerUnlocked = physStatuses.some((s) => s >= 1);

  return (
    <div className="pr-page">
      <div className="pr-bg-grid" />

      {/* Header */}
      <header className="pr-header">
        <button className="pr-back-btn" onClick={() => navigate("/home")}>
          ← HOME
        </button>
        <div className="pr-header-center">
          <div className="pr-header-title">Puzzle Room</div>
          <div className={`pr-header-timer ${isDanger ? "danger" : ""}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
        <div className="pr-score-display">
          <span className="pr-score-label">Score</span>
          <span className="pr-score-value">
            {userData ? userData.TotalScore.toFixed(1) : "0.0"}
          </span>
        </div>
      </header>

      <div className="pr-content">
        {/* TECH HUNT */}
        <div className="pr-section">
          <div className="pr-section-header">
            <span className="pr-section-title">⚡ Tech Hunt</span>
            <span className="pr-section-badge">8 PUZZLES</span>
            <span className="pr-section-badge">TRAIL: {trailType?.toUpperCase()}</span>
          </div>
          <div className="pr-puzzle-grid">
            {TECH_CODES.map((code, i) => (
              <PuzzleCard
                key={i}
                index={i}
                code={code}
                status={techStatuses[i]}
                timeVal={techTimes[i]}
                onClick={() => openPuzzle(i, "tech")}
              />
            ))}
          </div>
        </div>

        {/* SCAVENGER HUNT */}
        <div className="pr-section">
          <div className="pr-section-header">
            <span className="pr-section-title">🗺 Scavenger Hunt</span>
            <span className="pr-section-badge">5 PUZZLES</span>
            {!scavengerUnlocked && (
              <span className="pr-section-badge" style={{ color: "var(--pr-warn)" }}>
                UNLOCKS AFTER TECH #3
              </span>
            )}
          </div>

          {scavengerUnlocked ? (
            <div className="pr-puzzle-grid">
              {PHY_CODES.map((code, i) => (
                <PuzzleCard
                  key={i}
                  index={i}
                  code={code}
                  status={physStatuses[i]}
                  timeVal={physTimes[i]}
                  onClick={() => openPuzzle(i, "physical")}
                />
              ))}
            </div>
          ) : (
            <div className="pr-section-locked">
              🔒 SECTION LOCKED — Solve Tech Puzzle #3 to unlock Scavenger Hunt
            </div>
          )}
        </div>

        {/* BOSS LEVEL */}
        <div className="pr-boss-section">
          <button className="pr-boss-btn" onClick={() => setShowBossModal(true)}>
            <span>⚠ BOSS LEVEL</span>
          </button>
        </div>
      </div>

      {/* Puzzle Modal */}
      {activePuzzle && (
        <PuzzleModal
          puzzle={activePuzzle}
          onClose={() => { setActivePuzzle(null); setModalResult(null); }}
          onSubmit={handleSubmit}
          result={modalResult}
        />
      )}

      {/* Boss Flag Modal */}
      {showBossModal && (
        <BossFlagModal
          onClose={() => setShowBossModal(false)}
          onSuccess={handleBossSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`pr-toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
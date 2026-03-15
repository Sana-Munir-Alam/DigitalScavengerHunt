import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/PuzzleRoom.css";

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

// CLUE POPUP — shown after correct answer or when clicking a solved puzzle
function ClueModal({ clue, puzzleName, onClose }) {
  return (
    <div className="pr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pr-modal" style={{ borderColor: "var(--pr-secondary)" }}>
        <button className="pr-modal-close" onClick={onClose}>✕</button>
        <div className="pr-modal-title" style={{ color: "var(--pr-secondary)" }}>
          ✓ PUZZLE SOLVED
        </div>
        <div className="pr-modal-code">{puzzleName}</div>
        <div
          className="pr-modal-desc"
          style={{
            borderLeftColor: "var(--pr-secondary)",
            background: "rgba(0,255,136,0.05)",
            fontSize: "15px",
            letterSpacing: "1px",
          }}
        >
          <div style={{ fontSize: "10px", letterSpacing: "3px", color: "var(--pr-secondary)", marginBottom: "10px" }}>
            🔐 TRAIL CLUE — SAVE THIS
          </div>
          {clue}
        </div>
        <button
          className="pr-modal-submit"
          style={{ borderColor: "var(--pr-secondary)", color: "var(--pr-secondary)" }}
          onClick={onClose}
        >
          <span>ACKNOWLEDGED</span>
        </button>
      </div>
    </div>
  );
}

// PUZZLE MODAL — description + answer input
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
        <div className="pr-modal-code">
          {puzzle.puzzleName || "Classification: ACTIVE CHALLENGE"}
        </div>
        <div className="pr-modal-desc">{puzzle.description}</div>
        
        {puzzle.link && (
          <a href={puzzle.link} target="_blank" rel="noopener noreferrer" className="pr-modal-link">
            📎 Open Puzzle File
          </a>
        )}
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
  const [puzzleData, setPuzzleData] = useState({ tech: [], physical: [] });
  const [timeRemaining, setTimeRemaining] = useState(7200);
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [modalResult, setModalResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [showBossModal, setShowBossModal] = useState(false);
  // Clue popup state
  const [cluePopup, setCluePopup] = useState(null); // { clue, puzzleName }

  const fetchData = useCallback(async () => {
    try {
      const [userRes, puzzleRes] = await Promise.all([
        axios.get(`/api/user/${teamName}`),
        puzzleData.tech.length === 0
          ? axios.get(`/api/puzzles/${trailType}`)
          : Promise.resolve(null),
      ]);
      const data = userRes.data;
      setUserData(data);

      // Only update timer from server when game is active; reset when not
      if (data.gameActive) {
        setTimeRemaining(data.timeRemaining);
      } else {
        setTimeRemaining(7200);
      }

      if (puzzleRes) {
        setPuzzleData(puzzleRes.data);
      }

      // Handle game ended by admin — redirect to success or failure
      if (data.gameEnded) {
        if (data.SafeStatus) {
          navigate("/success");
        } else {
          navigate("/failure");
        }
      }
    } catch (err) {
      console.error(err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName, trailType]);

  useEffect(() => {
    if (!teamName) { navigate("/login"); return; }
    fetchData();
    const poll = setInterval(fetchData, 6000);
    return () => clearInterval(poll);
  }, [teamName, navigate, fetchData]);

  // Live countdown — only runs when game is active.
  // Clears automatically when gameActive flips false (deactivate/reset/end).
  const gameActive = userData?.gameActive ?? true;
  useEffect(() => {
    if (!gameActive) return;
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
  }, [gameActive, navigate]);

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

    const puzzles = type === "tech" ? puzzleData.tech : puzzleData.physical;
    const puzzle = puzzles[index];
    const code = type === "tech" ? TECH_CODES[index] : PHY_CODES[index];

    // If already solved — show the clue popup instead of answer form
    if (status === 2) {
      setCluePopup({ clue: puzzle?.Clue || "—", puzzleName: puzzle?.PuzzleName || code });
      return;
    }

    // If wrong status, retry first
    if (status === 3) {
      handleRetry(index, type);
      return;
    }

    setActivePuzzle({
      index,
      code,
      description: puzzle?.Description || "Loading...",
      puzzleName: puzzle?.PuzzleName || code,
      link: puzzle?.Link || "",
      status,
    });
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
      const puzzles = type === "tech" ? puzzleData.tech : puzzleData.physical;
      const puzzle = puzzles[index];
      const code = type === "tech" ? TECH_CODES[index] : PHY_CODES[index];
      setActivePuzzle({
        index,
        code,
        description: puzzle?.Description || "Loading...",
        puzzleName: puzzle?.PuzzleName || code,
        link: puzzle?.Link || "",
        status: 1,
      });
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
        await fetchData();
        setActivePuzzle(null);
        setModalResult(null);
        // Show the clue popup
        const puzzles = activeType === "tech" ? puzzleData.tech : puzzleData.physical;
        const puzzle = puzzles[activePuzzle.index];
        setCluePopup({
          clue: res.data.clue || puzzle?.Clue || "—",
          puzzleName: puzzle?.PuzzleName || activePuzzle.code,
        });
        showToast("✓ CORRECT! +10 pts", "correct-toast");
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

  // Boss button counter: all 13 puzzles must be solved (8 tech + 5 physical)
  const techSolved = techStatuses.filter((s) => s === 2).length;
  const physSolved = physStatuses.filter((s) => s === 2).length;
  const totalSolved = techSolved + physSolved;
  const TOTAL_PUZZLES = 13;
  const allPuzzlesSolved = totalSolved === TOTAL_PUZZLES;

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
          <button
            className={`pr-boss-btn ${!allPuzzlesSolved ? "disabled" : ""}`}
            onClick={() => allPuzzlesSolved && setShowBossModal(true)}
            disabled={!allPuzzlesSolved}
            title={allPuzzlesSolved ? "Enter Boss Level" : `Solve all puzzles first (${totalSolved}/${TOTAL_PUZZLES})`}
            style={!allPuzzlesSolved ? { opacity: 0.4, cursor: "not-allowed", borderColor: "rgba(255,68,102,0.3)" } : {}}
          >
            <span>
              {allPuzzlesSolved
                ? "⚠ BOSS LEVEL — ENTER"
                : `⚠ BOSS LEVEL  ${totalSolved}/${TOTAL_PUZZLES}`}
            </span>
          </button>
        </div>
      </div>

      {/* Puzzle Modal (description + answer) */}
      {activePuzzle && (
        <PuzzleModal
          puzzle={activePuzzle}
          onClose={() => { setActivePuzzle(null); setModalResult(null); }}
          onSubmit={handleSubmit}
          result={modalResult}
        />
      )}

      {/* Clue Popup (after correct answer or clicking solved puzzle) */}
      {cluePopup && (
        <ClueModal
          clue={cluePopup.clue}
          puzzleName={cluePopup.puzzleName}
          onClose={() => setCluePopup(null)}
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
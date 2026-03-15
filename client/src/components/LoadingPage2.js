import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/LoadingPage2.css";

const CODE_LINES = [
  { text: "import sys, os, hashlib", cls: "highlight" },
  { text: "from crypto import AES", cls: "" },
  { text: "# Initializing secure env", cls: "blue" },
  { text: "KEY = os.urandom(32)", cls: "" },
  { text: "IV = os.urandom(16)", cls: "" },
  { text: "cipher = AES.new(KEY, AES.MODE_CBC, IV)", cls: "" },
  { text: "def decrypt(data):", cls: "highlight" },
  { text: "  return cipher.decrypt(data)", cls: "" },
  { text: "# Loading puzzle matrix...", cls: "blue" },
  { text: "matrix = [[0]*8 for _ in range(8)]", cls: "" },
  { text: "for row in matrix:", cls: "" },
  { text: "  for cell in row:", cls: "" },
  { text: "    cell = randint(0, 255)", cls: "dim" },
  { text: "# Connecting uplink...", cls: "blue" },
  { text: "socket.connect(('dsh.event', 443))", cls: "" },
  { text: "TLS_HANDSHAKE = True", cls: "highlight" },
  { text: "SESSION_TOKEN = uuid4()", cls: "" },
  { text: "# Verifying team identity...", cls: "blue" },
  { text: "hash = sha256(team_id).hexdigest()", cls: "" },
  { text: "if hash in authorized:", cls: "" },
  { text: "  STATUS = 'GRANTED'", cls: "highlight" },
  { text: "# Mapping puzzle trails...", cls: "blue" },
  { text: "trails = ['RED', 'GREEN', 'BLUE']", cls: "" },
  { text: "puzzles = load_puzzles(trail_id)", cls: "" },
  { text: "# UPLINK ESTABLISHED", cls: "highlight" },
  { text: "print('>> READY')", cls: "" },
  { text: "sys.stdout.flush()", cls: "dim" },
];

const STATUS_ITEMS = [
  "Verifying team credentials",
  "Loading puzzle database",
  "Syncing game timer",
  "Mapping trail configuration",
  "Establishing secure channel",
  "System ready",
];

const PROGRESS_BARS = [
  { label: "Auth Layer", pct: 100, duration: "0.8s", delay: "0s" },
  { label: "Puzzle Matrix", pct: 100, duration: "1.2s", delay: "0.3s" },
  { label: "Timer Sync", pct: 100, duration: "1.6s", delay: "0.6s" },
];

const COORDS = [
  "LAT: 24.8607° N", "LON: 67.0011° E", "ALT: 08m MSL",
  "GRID: NJ7423", "UTC: SYNC OK", "SAT: 12/14",
  "LAT: 24.8607° N", "LON: 67.0011° E",
];

export default function LoadingPage2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visibleItems, setVisibleItems] = useState([]);
  const role = location.state?.role || sessionStorage.getItem("role");

  useEffect(() => {
    STATUS_ITEMS.forEach((_, i) => {
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, i]);
      }, i * 400 + 200);
    });

    setTimeout(() => {
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    }, 3500);
  }, [navigate, role]);

  return (
    <div className="lp2-page">
      {/* Code panel */}
      <div className="lp2-code-panel">
        <div className="lp2-code-scroll">
          {[...CODE_LINES, ...CODE_LINES].map((line, i) => (
            <div key={i} className={`lp2-code-line ${line.cls}`}>
              {line.text}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="lp2-main">
        {/* Coordinates top-right */}
        <div className="lp2-coords">
          <div className="lp2-coords-inner">
            {[...COORDS, ...COORDS].map((c, i) => (
              <div key={i} className="lp2-coord-line">{c}</div>
            ))}
          </div>
        </div>

        <div className="lp2-title">
          <span className="lp2-title-main">SYSTEM BOOT</span>
          <span className="lp2-title-sub">INITIALIZING GAME ENVIRONMENT</span>
        </div>

        {/* Circuit animation */}
        <div className="lp2-circuit-wrap">
          <svg className="lp2-circuit-svg" viewBox="0 0 200 200">
            <g fill="none" stroke="#00ff88" strokeWidth="1.5">
              <rect x="80" y="80" width="40" height="40" />
              <line x1="100" y1="20" x2="100" y2="80" />
              <line x1="180" y1="100" x2="140" y2="100" />
              <line x1="100" y1="120" x2="100" y2="180" />
              <line x1="20" y1="100" x2="60" y2="100" />
              <line x1="100" y1="20" x2="60" y2="20" />
              <line x1="60" y1="20" x2="20" y2="60" />
              <line x1="20" y1="60" x2="20" y2="100" />
              <line x1="100" y1="20" x2="140" y2="20" />
              <line x1="140" y1="20" x2="180" y2="60" />
              <line x1="180" y1="60" x2="180" y2="100" />
              <circle cx="100" cy="20" r="4" fill="#00ff88" />
              <circle cx="180" cy="100" r="4" fill="#00ff88" />
              <circle cx="100" cy="180" r="4" fill="#00ff88" />
              <circle cx="20" cy="100" r="4" fill="#00ff88" />
              <circle cx="60" cy="20" r="3" fill="none" stroke="#00e5ff" />
              <circle cx="140" cy="20" r="3" fill="none" stroke="#00e5ff" />
            </g>
          </svg>
          <div className="lp2-ping-ring" />
          <div className="lp2-ping-ring" />
          <div className="lp2-ping-ring" />
        </div>

        {/* Status items */}
        <div className="lp2-status-list">
          {STATUS_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`lp2-status-item ${visibleItems.includes(i) ? "visible" : ""}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`lp2-status-dot ${visibleItems.includes(i) ? "" : "pending"}`} />
              <span className="lp2-status-label">{item}</span>
              {visibleItems.includes(i) && <span className="lp2-status-tick">✓</span>}
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="lp2-progress-group">
          {PROGRESS_BARS.map((bar, i) => (
            <div key={i}>
              <div className="lp2-progress-label">
                <span>{bar.label}</span>
                <span>100%</span>
              </div>
              <div className="lp2-progress-track">
                <div
                  className="lp2-progress-fill"
                  style={{ "--duration": bar.duration, "--delay": bar.delay }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
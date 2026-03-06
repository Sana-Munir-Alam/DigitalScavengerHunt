import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoadingPage1.css";

const ENCRYPTED_FRAGMENTS = [
  "0x4F2A_INIT", "SYS::BOOT", "NET_SCAN▓▓", "PKT::0xAF",
  "AUTH_KEY?", "DECRYPT>>", "TRACE_ID=9F2", "SIGNAL_OK",
  ">>UPLINK", "HASH:SHA256", "PORT:8443", "PING::LOST",
  "MASK=FF:FF", "0b1010_1101", "ENV=PROD", "VPN_OK",
];

const FloatText = ({ text, style }) => (
  <div className="lp1-float-text" style={style}>{text}</div>
);

export default function LoadingPage1() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [locked, setLocked] = useState(false);
  const [statusText, setStatusText] = useState("SCANNING ENVIRONMENT...");
  const [floatTexts, setFloatTexts] = useState([]);
  const intervalRef = useRef(null);

  // Progress bar
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current);
          return 100;
        }
        return p + 1;
      });
    }, 60);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Status text changes
  useEffect(() => {
    const stages = [
      { at: 20, text: "LOCATING AGENTS..." },
      { at: 40, text: "VERIFYING CLEARANCE..." },
      { at: 60, text: "ESTABLISHING UPLINK..." },
      { at: 80, text: "DECRYPTING CHANNEL..." },
      { at: 95, text: "TARGET ACQUIRED" },
      { at: 100, text: "ACCESS GRANTED" },
    ];
    const matched = stages.filter((s) => s.at <= progress).pop();
    if (matched) setStatusText(matched.text);
    if (progress >= 98) setLocked(true);
    if (progress >= 100) {
      setTimeout(() => navigate("/login"), 800);
    }
  }, [progress, navigate]);

  // Floating encrypted text
  useEffect(() => {
    const timer = setInterval(() => {
      const text = ENCRYPTED_FRAGMENTS[Math.floor(Math.random() * ENCRYPTED_FRAGMENTS.length)];
      const id = Date.now();
      const newItem = {
        id,
        text,
        style: {
          top: `${Math.random() * 80 + 5}%`,
          left: `${Math.random() * 80 + 5}%`,
          animation: "lp1-float-text 3s ease forwards",
          animationDuration: `${2 + Math.random() * 2}s`,
        },
      };
      setFloatTexts((prev) => [...prev.slice(-10), newItem]);
      setTimeout(() => {
        setFloatTexts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lp1-container">
      {/* Background grid */}
      <div className="lp1-grid-bg" />

      {/* Scan lines */}
      {[1, 2, 3, 4].map((i) => <div key={i} className="lp1-scan-line" />)}
      <div className="lp1-vscan" />

      {/* Corners */}
      <div className="lp1-corner lp1-corner-tl" />
      <div className="lp1-corner lp1-corner-tr" />
      <div className="lp1-corner lp1-corner-bl" />
      <div className="lp1-corner lp1-corner-br" />

      {/* Radar */}
      <div className="lp1-radar-container">
        <div className="lp1-radar">
          <div className="lp1-radar-cross-h" />
          <div className="lp1-radar-cross-v" />
          <div className="lp1-radar-sweep" />
          <div className="lp1-radar-dot" />
          <div className="lp1-radar-dot" />
          <div className="lp1-radar-dot" />
        </div>
      </div>

      {/* Gears */}
      <div className="lp1-gears">
        <div className="lp1-gear lp1-gear-large" />
        <div className="lp1-gear lp1-gear-medium" />
        <div className="lp1-gear lp1-gear-small" />
      </div>

      {/* Signal bars */}
      <div className="lp1-signal-bars">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="lp1-bar" />
        ))}
      </div>

      {/* Targeting reticle */}
      <div className={`lp1-target ${locked ? "locked" : ""}`}>
        <div className="lp1-target-ring" />
        <div className="lp1-target-line-h" />
        <div className="lp1-target-line-v" />
        <div className="lp1-target-center" />
      </div>

      {/* Floating text */}
      {floatTexts.map((t) => (
        <FloatText key={t.id} text={t.text} style={t.style} />
      ))}

      {/* Main content */}
      <div className="lp1-content">
        <div className="lp1-title">DIGITAL SCAVENGER HUNT</div>
        <div className="lp1-subtitle">DEVDAY 2026 — SECURE TERMINAL v2.6.0</div>

        <div className={`lp1-status-text ${progress >= 100 ? "done" : ""}`}>
          ► {statusText}
        </div>

        <div className="lp1-progress-wrap">
          <div className="lp1-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="lp1-progress-pct">{progress.toString().padStart(3, "0")}%</div>
      </div>
    </div>
  );
}
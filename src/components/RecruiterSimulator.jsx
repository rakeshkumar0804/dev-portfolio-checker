import { useState, useEffect, useRef } from "react";

const SCAN_DURATION = 10; // seconds

export default function RecruiterSimulator({ aiFeedback, profile, scores }) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SCAN_DURATION);
  const [progress, setProgress] = useState(0);
  const [visiblePositives, setVisiblePositives] = useState([]);
  const [visibleNegatives, setVisibleNegatives] = useState([]);
  const intervalRef = useRef(null);

  const impression = aiFeedback?.recruiterFirstImpression || {};
  const positives = impression.positives || [];
  const negatives = impression.negatives || [];
  const verdict = impression.verdict || "Needs Polish";
  const thought = impression.thought || `Recruiter scanned @${profile?.username}'s profile in 10 seconds.`;

  const verdictColor = {
    "Strong Candidate":   "var(--green)",
    "Promising Developer": "var(--cyan)",
    "Needs Polish":       "var(--yellow)",
    "Early Stage":        "var(--red)",
  }[verdict] || "var(--txt-2)";

  function startScan() {
    setScanning(true);
    setDone(false);
    setTimeLeft(SCAN_DURATION);
    setProgress(0);
    setVisiblePositives([]);
    setVisibleNegatives([]);

    let elapsed = 0;
    const tick = 100; // ms
    intervalRef.current = setInterval(() => {
      elapsed += tick;
      const pct = (elapsed / (SCAN_DURATION * 1000)) * 100;
      setProgress(Math.min(pct, 100));
      setTimeLeft(Math.max(0, SCAN_DURATION - elapsed / 1000));

      // Reveal positives/negatives progressively
      const posIndex = Math.floor((elapsed / (SCAN_DURATION * 1000)) * positives.length);
      const negIndex = Math.floor((elapsed / (SCAN_DURATION * 1000)) * negatives.length);
      setVisiblePositives(positives.slice(0, posIndex));
      setVisibleNegatives(negatives.slice(0, negIndex));

      if (elapsed >= SCAN_DURATION * 1000) {
        clearInterval(intervalRef.current);
        setScanning(false);
        setDone(true);
        setVisiblePositives(positives);
        setVisibleNegatives(negatives);
      }
    }, tick);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="recruiter-sim-card">
      <div className="recruiter-sim-header">
        <div>
          <div className="recruiter-sim-title">👁️ 10-Second Recruiter Scan</div>
          <div style={{ fontSize: "0.78rem", color: "var(--txt-3)", marginTop: 2 }}>
            Simulating what a recruiter notices in their first 10 seconds
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {scanning && (
            <div className="recruiter-timer">{timeLeft.toFixed(1)}s</div>
          )}
          {!scanning && (
            <button className="btn-secondary" onClick={startScan} style={{ fontSize: "0.85rem" }}>
              {done ? "🔄 Run Again" : "▶ Start Scan"}
            </button>
          )}
        </div>
      </div>

      <div className="recruiter-sim-body">
        {scanning && (
          <div className="recruiter-scan-bar">
            <div className="recruiter-scan-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {(scanning || done) && (
          <>
            {done && (
              <div className="recruiter-verdict">
                <div className="recruiter-verdict-label">Recruiter's Verdict</div>
                <div className="recruiter-verdict-text" style={{ color: verdictColor }}>
                  "{verdict}"
                </div>
                <div style={{ fontSize: "0.84rem", color: "var(--txt-2)", marginTop: 10, fontStyle: "italic" }}>
                  {thought}
                </div>
              </div>
            )}

            <div className="recruiter-lists">
              <div className="recruiter-list-box positives">
                <div className="recruiter-list-title">✅ Notices First</div>
                {visiblePositives.map((item, i) => (
                  <div key={i} className="recruiter-list-item">
                    <div className="recruiter-list-dot" />
                    <span>{item}</span>
                  </div>
                ))}
                {scanning && visiblePositives.length < positives.length && (
                  <div style={{ fontSize: "0.75rem", color: "var(--txt-4)", fontStyle: "italic" }}>Scanning…</div>
                )}
              </div>
              <div className="recruiter-list-box negatives">
                <div className="recruiter-list-title">⚠️ Red Flags Spotted</div>
                {visibleNegatives.map((item, i) => (
                  <div key={i} className="recruiter-list-item">
                    <div className="recruiter-list-dot" />
                    <span>{item}</span>
                  </div>
                ))}
                {scanning && visibleNegatives.length < negatives.length && (
                  <div style={{ fontSize: "0.75rem", color: "var(--txt-4)", fontStyle: "italic" }}>Scanning…</div>
                )}
              </div>
            </div>
          </>
        )}

        {!scanning && !done && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--txt-3)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>👀</div>
            <div style={{ fontSize: "0.95rem", marginBottom: 8 }}>
              Click "Start Scan" to simulate a recruiter reviewing your profile
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              See exactly what they notice — and what puts them off — in 10 seconds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

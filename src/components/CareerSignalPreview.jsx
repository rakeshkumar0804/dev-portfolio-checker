import { useMemo, useState } from "react";

const SCENARIOS = {
  emerging: { label: "Emerging", values: [44, 52, 36, 48], note: "Build proof, then polish the story." },
  ready: { label: "Interview ready", values: [78, 82, 72, 80], note: "Strong evidence. Focus on your top two projects." },
  standout: { label: "Standout", values: [91, 88, 94, 90], note: "A profile that earns a second look." },
};

const AXES = ["GitHub", "Projects", "Portfolio", "Resume"];

function pointAt(value, index) {
  const angle = (-90 + index * 90) * (Math.PI / 180);
  const radius = 32 * (value / 100);
  return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
}

export default function CareerSignalPreview() {
  const [scenario, setScenario] = useState("ready");
  const current = SCENARIOS[scenario];
  const overall = Math.round(current.values.reduce((sum, value) => sum + value, 0) / current.values.length);
  const polygon = useMemo(() => current.values.map(pointAt).join(" "), [current]);

  return (
    <section className="signal-preview" aria-label="Career signal score preview">
      <div className="signal-preview-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="signal-eyebrow">Career Signal</span>
            <span className="sample-report-badge">Sample Report</span>
          </div>
          <h2>Evidence behind every score.</h2>
        </div>
        <div className="signal-score" aria-label={`Example overall score ${overall} out of 100`}>
          <strong>{overall}</strong><span>/100</span>
        </div>
      </div>

      <div className="signal-preview-body">
        <div className="signal-radar-wrap" aria-hidden="true">
          <svg className="signal-radar" viewBox="0 0 100 100">
            <polygon className="signal-grid" points="50,10 90,50 50,90 10,50" />
            <polygon className="signal-grid signal-grid-inner" points="50,30 70,50 50,70 30,50" />
            <line x1="50" y1="10" x2="50" y2="90" />
            <line x1="10" y1="50" x2="90" y2="50" />
            <polygon className="signal-shape" points={polygon} />
            {current.values.map((value, index) => {
              const [cx, cy] = pointAt(value, index).split(",");
              return <circle key={AXES[index]} className="signal-node" cx={cx} cy={cy} r="2.6" />;
            })}
          </svg>
          <span className="signal-axis axis-top">GitHub</span>
          <span className="signal-axis axis-right">Projects</span>
          <span className="signal-axis axis-bottom">Portfolio</span>
          <span className="signal-axis axis-left">Resume</span>
        </div>

        <div className="signal-copy">
          <p className="signal-note">{current.note}</p>
          <div className="signal-bars">
            {current.values.map((value, index) => (
              <div className="signal-bar-row" key={AXES[index]}>
                <span>{AXES[index]}</span>
                <div><i style={{ width: `${value}%` }} /></div>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signal-scenarios" role="group" aria-label="Preview career signal scenarios">
        {Object.entries(SCENARIOS).map(([id, item]) => (
          <button key={id} type="button" className={scenario === id ? "active" : ""} onClick={() => setScenario(id)}>
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

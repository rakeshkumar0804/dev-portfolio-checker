const LANG_COLORS = {
  JavaScript: "#f7df1e", TypeScript: "#3178c6", Python: "#3572A5",
  Java: "#b07219", "C++": "#f34b7d", "C#": "#239120", Go: "#00ADD8",
  Rust: "#dea584", Ruby: "#701516", PHP: "#4F5D95", Swift: "#ffac45",
  Kotlin: "#A97BFF", HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051",
  Vue: "#41b883", React: "#61dafb", Dart: "#00B4AB", R: "#198CE7",
};

export default function LanguageBar({ languages = [] }) {
  if (!languages.length) {
    return <p style={{ color: "var(--txt-3)", fontSize: "0.85rem" }}>No language data available</p>;
  }

  return (
    <div className="lang-bar-wrap">
      {languages.map((lang) => (
        <div key={lang.language} className="lang-row">
          <div className="lang-row-top">
            <span className="lang-name">
              <span
                style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: LANG_COLORS[lang.language] || "var(--cyan)",
                  marginRight: 6, verticalAlign: "middle",
                }}
              />
              {lang.language}
            </span>
            <span className="lang-pct">{lang.percentage}%</span>
          </div>
          <div className="lang-bg">
            <div
              className="lang-fill"
              style={{
                width: `${lang.percentage}%`,
                background: LANG_COLORS[lang.language] || "var(--cyan)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

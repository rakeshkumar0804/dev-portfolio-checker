import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon.jsx";

/**
 * Staged analysis loading screen.
 *
 * Props:
 *   githubUsername  — truthy when GitHub was selected
 *   portfolioUrl   — truthy when Portfolio was selected
 *   resumeFile     — truthy when a resume PDF was selected
 *   apiDone        — true once the backend response has arrived (success or failure)
 *   apiError       — error message string when the request failed, null otherwise
 *   onComplete     — called after progress reaches 100% and exit animation finishes
 *   onRetry        — called when the user clicks "Try Again" after an error
 */
export default function LoadingScreen({
  githubUsername,
  portfolioUrl,
  resumeFile,
  apiDone = false,
  apiError = null,
  onComplete,
  onRetry,
}) {
  // Build stages dynamically from selected inputs
  const stages = useRef([]);
  if (stages.current.length === 0) {
    if (githubUsername) {
      stages.current.push({
        icon: "github",
        label: "Searching public GitHub profile\u2026",
      });
      stages.current.push({
        icon: "bar-chart",
        label: "Inspecting repositories and activity\u2026",
      });
    }
    if (portfolioUrl) {
      stages.current.push({
        icon: "globe",
        label: "Auditing portfolio response and structure\u2026",
      });
    }
    if (resumeFile) {
      stages.current.push({
        icon: "file-text",
        label: "Parsing resume PDF and ATS keywords\u2026",
      });
    }
    stages.current.push({
      icon: "zap",
      label: "Calculating evidence scores\u2026",
    });
    stages.current.push({
      icon: "star",
      label: "Building your personalized report\u2026",
    });
  }

  const totalStages = stages.current.length;
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showError, setShowError] = useState(false);
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const stageRef = useRef(0);
  const progressRef = useRef(0);
  const apiDoneRef = useRef(false);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Phase 1: Simulated progress \u2014 advance through stages with increasing delays
  const advanceStage = useCallback(() => {
    if (apiDoneRef.current) return;

    const stage = stageRef.current;
    if (stage >= totalStages - 1) return;

    const nextStage = stage + 1;
    stageRef.current = nextStage;

    const maxSimProgress = 85;
    const stageProgress = Math.min(
      maxSimProgress,
      Math.round(((nextStage + 0.5) / totalStages) * maxSimProgress)
    );

    progressRef.current = stageProgress;
    setCurrentStage(nextStage);
    setProgress(stageProgress);

    const baseDelay = prefersReducedMotion ? 400 : 1200;
    const stageDelay = baseDelay + nextStage * 400;

    if (nextStage < totalStages - 1) {
      timerRef.current = setTimeout(advanceStage, stageDelay);
    }
  }, [totalStages, prefersReducedMotion]);

  // Start Phase 1 on mount
  useEffect(() => {
    setCurrentStage(0);
    setProgress(5);
    progressRef.current = 5;

    const initialDelay = prefersReducedMotion ? 300 : 1000;
    timerRef.current = setTimeout(advanceStage, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [advanceStage, prefersReducedMotion]);

  // Phase 2: When API completes, animate remaining progress to 100%
  useEffect(() => {
    if (!apiDone) return;
    apiDoneRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (apiError) {
      const errorDelay = prefersReducedMotion ? 100 : 400;
      finishTimerRef.current = setTimeout(() => {
        setShowError(true);
      }, errorDelay);
      return;
    }

    // Success: complete all remaining stages, animate to 100%
    setFinishing(true);
    setCurrentStage(totalStages);
    setProgress(100);

    const exitDelay = prefersReducedMotion ? 200 : 900;
    finishTimerRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, exitDelay);
  }, [apiDone, apiError, totalStages, onComplete, prefersReducedMotion]);

  function getStageStatus(index) {
    if (showError && index >= currentStage) return "pending";
    if (index < currentStage) return "done";
    if (index === currentStage) return "active";
    return "pending";
  }

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-card anim-fade-up">
        <div className="loading-logo">
          <Icon name="search" size={32} style={{ color: "var(--cyan)" }} />
        </div>
        <h2 className="loading-title">
          {showError ? "Analysis Issue" : finishing ? "Finalizing Report" : "Analyzing Your Profile"}
        </h2>
        <p className="loading-sub">
          {showError
            ? "Something went wrong during the analysis."
            : `Running ${totalStages} tailored checks across your selected inputs\u2026`}
        </p>

        <div className="loading-steps">
          {stages.current.map((s, i) => {
            const status = getStageStatus(i);
            return (
              <div
                key={i}
                className={`loading-step ${status}`}
              >
                <span className="loading-step-icon">
                  {status === "done" ? (
                    <Icon name="check-circle" size={16} style={{ color: "var(--green)" }} />
                  ) : status === "active" ? (
                    <span className="loading-spinner-icon">
                      <Icon name="refresh" size={16} style={{ color: "var(--cyan)" }} />
                    </span>
                  ) : (
                    <Icon name={s.icon} size={16} style={{ color: "var(--txt-3)" }} />
                  )}
                </span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {showError && (
          <div className="loading-error anim-fade-up">
            <div className="loading-error-icon">
              <Icon name="alert-triangle" size={20} style={{ color: "var(--yellow)" }} />
            </div>
            <p className="loading-error-msg">{apiError}</p>
            {onRetry && (
              <button
                className="btn-primary"
                onClick={onRetry}
                style={{ marginTop: 12, padding: "8px 20px", fontSize: "0.85rem" }}
              >
                <Icon name="refresh" size={14} style={{ marginRight: 6 }} />
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Progress bar */}
        {!showError && (
          <div className="loading-progress">
            <div className="loading-progress-bar">
              <div
                className={`loading-progress-fill ${finishing ? "finishing" : ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: "0.75rem",
                color: "var(--txt-3)",
              }}
            >
              <span>
                {finishing
                  ? "Finalizing\u2026"
                  : currentStage < totalStages
                  ? stages.current[currentStage]?.label || "Analyzing\u2026"
                  : "Analyzing\u2026"}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

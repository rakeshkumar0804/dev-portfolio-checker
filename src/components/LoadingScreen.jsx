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
  githubUsername = null,
  portfolioUrl = null,
  resumeFile = null,
  apiDone = false,
  apiError = null,
  retryAfterSeconds = null,
  onComplete = null,
  onRetry = null,
  onContinueGuest = null,
  onSignIn = null,
  onCancel = null,
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
  const [remainingSeconds, setRemainingSeconds] = useState(
    typeof retryAfterSeconds === "number" && retryAfterSeconds > 0 ? retryAfterSeconds : 0
  );
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const stageRef = useRef(0);
  const progressRef = useRef(0);
  const apiDoneRef = useRef(false);

  // Sync remainingSeconds when retryAfterSeconds prop changes
  useEffect(() => {
    if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
      setRemainingSeconds(retryAfterSeconds);
    } else {
      setRemainingSeconds(0);
    }
  }, [retryAfterSeconds]);

  // Live countdown timer ticking down to 0
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Phase 1: Simulated progress — rotate active check highlight with increasing delays
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
      const errorDelay = prefersReducedMotion ? 100 : 300;
      finishTimerRef.current = setTimeout(() => {
        setShowError(true);
      }, errorDelay);
      return;
    }

    // Success: report results arrived, mark stages done and complete progress
    setFinishing(true);
    setCurrentStage(totalStages);
    setProgress(100);

    const exitDelay = prefersReducedMotion ? 200 : 900;
    finishTimerRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, exitDelay);
  }, [apiDone, apiError, totalStages, onComplete, prefersReducedMotion]);

  // Honest stage status: stages are marked "done" ONLY when the backend has
  // actually succeeded and finalized the report. During in-flight processing,
  // the currently highlighted check is "active", and no stage displays a premature checkmark.
  function getStageStatus(index) {
    if (showError) return "pending";
    if (finishing) return "done";
    if (index === currentStage) return "active";
    return "pending";
  }

  const isSessionError =
    Boolean(apiError) &&
    ((apiError.toLowerCase().includes("session") && apiError.toLowerCase().includes("expired")) ||
      apiError.toLowerCase().includes("sign in") ||
      apiError.toLowerCase().includes("authentication required"));

  const isRateLimitError =
    Boolean(apiError) &&
    (apiError.toLowerCase().includes("too many requests") ||
      apiError.toLowerCase().includes("rate limit") ||
      (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0));

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-card anim-fade-up">
        <div className="loading-logo">
          <Icon name="search" size={32} style={{ color: "var(--cyan)" }} />
        </div>
        <h2 className="loading-title">
          {showError
            ? isSessionError
              ? "Session Expired"
              : isRateLimitError
              ? "Rate Limit Reached"
              : "Analysis Issue"
            : finishing
            ? "Finalizing Report"
            : "Analyzing Your Profile"}
        </h2>
        <p className="loading-sub">
          {showError
            ? isSessionError
              ? "Your session has expired. You can continue analysis as a guest or sign in to save reports."
              : isRateLimitError
              ? remainingSeconds > 0
                ? `Please wait ${remainingSeconds}s before retrying analysis.`
                : "Too many requests were sent in a short period. Please wait a few moments before trying again."
              : "Something went wrong during the analysis."
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
              <Icon
                name={isSessionError ? "user" : isRateLimitError ? "clock" : "alert-triangle"}
                size={20}
                style={{
                  color: isSessionError
                    ? "var(--cyan)"
                    : isRateLimitError
                    ? "var(--amber, #f59e0b)"
                    : "var(--yellow)",
                }}
              />
            </div>
            <p className="loading-error-msg">{apiError}</p>
            {isRateLimitError && remainingSeconds > 0 && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--txt-3)",
                  marginTop: -4,
                  marginBottom: 10,
                }}
              >
                Retry will be enabled in {remainingSeconds}s.
              </p>
            )}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              {isSessionError && onContinueGuest && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onContinueGuest}
                  style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="arrow-right" size={14} />
                  Continue as Guest
                </button>
              )}
              {isSessionError && onSignIn && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onSignIn}
                  style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="lock" size={14} />
                  Sign In
                </button>
              )}
              {!isSessionError && onRetry && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onRetry}
                  disabled={isRateLimitError && remainingSeconds > 0}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: isRateLimitError && remainingSeconds > 0 ? 0.6 : 1,
                    cursor: isRateLimitError && remainingSeconds > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <Icon name={isRateLimitError && remainingSeconds > 0 ? "clock" : "refresh"} size={14} />
                  {isRateLimitError && remainingSeconds > 0
                    ? `Wait (${remainingSeconds}s)`
                    : "Try Again"}
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onCancel}
                  style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
              )}
            </div>
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

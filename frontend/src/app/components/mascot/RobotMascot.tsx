import { clsx } from "clsx";
import type { MascotSnapshot } from "./robotMascotState";
import "./robotMascot.css";

type RobotMascotProps = {
  snapshot: MascotSnapshot;
  size?: number;
  className?: string;
};

export function RobotMascot({ snapshot, size = 48, className }: RobotMascotProps) {
  return (
    <div
      className={clsx("robot-mascot-root inline-block", className)}
      data-state={snapshot.state}
      data-mood={snapshot.mood}
      title={snapshot.message}
      aria-label={snapshot.message}
      role="img"
      style={{ width: size, height: size }}
    >
      <svg className="robot-mascot-svg h-full w-full" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <ellipse className="robot-shadow" cx="48" cy="70" rx="15" ry="4.5" fill="color-mix(in srgb, var(--rm-color-line) 22%, transparent)" />
        <g className="robot-body-wrap">
          <line x1="48" y1="22" x2="48" y2="14" stroke="var(--rm-color-line)" strokeWidth="2.4" strokeLinecap="round" />
          <circle className="robot-antenna-dot" cx="48" cy="11" r="3.2" fill="var(--rm-color-overlay)" />

          <g className="robot-head">
            <rect x="29" y="24" width="38" height="30" rx="11" fill="var(--rm-color-body)" stroke="var(--rm-color-line)" strokeWidth="2.2" />
            <rect x="35" y="31" width="26" height="15" rx="7.5" fill="color-mix(in srgb, var(--rm-color-overlay) 14%, transparent)" />
            <circle className="robot-eye robot-eye-left" cx="44" cy="38.5" r="2.2" fill="var(--rm-color-eye)" />
            <circle className="robot-eye robot-eye-right" cx="52" cy="38.5" r="2.2" fill="var(--rm-color-eye)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

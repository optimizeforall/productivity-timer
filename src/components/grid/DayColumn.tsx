"use client";

import { useState } from "react";
import type { TimeEntry, Category } from "@/types";

// Generate a cool gradient based on the category color
function createCoolGradient(
  baseColor: string,
  isHovered: boolean = false,
): string {
  // Remove # if present
  const hex = baseColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Create cooler variations by shifting towards blues and cyans
  const coolR = Math.max(0, Math.floor(r * 0.7));
  const coolG = Math.min(255, Math.floor(g * 1.1));
  const coolB = Math.min(255, Math.floor(b * 1.3));

  // Create a lighter version for the gradient end
  const lightR = Math.min(255, coolR + 40);
  const lightG = Math.min(255, coolG + 30);
  const lightB = Math.min(255, coolB + 20);

  const opacity = isHovered ? "0.8" : "0.6";
  const endOpacity = isHovered ? "0.4" : "0.2";

  return `linear-gradient(135deg, rgba(${coolR}, ${coolG}, ${coolB}, ${opacity}), rgba(${lightR}, ${lightG}, ${lightB}, ${endOpacity}))`;
}

interface DayColumnProps {
  dayLabel: string;
  entries: TimeEntry[];
  categories: Category[];
  hoursPerDay: number;
  maxHoursDisplay: number;
  isToday?: boolean;
  onClick?: () => void;
  hideLabels?: boolean;
}

export default function DayColumn({
  dayLabel,
  entries,
  categories,
  hoursPerDay,
  maxHoursDisplay,
  isToday,
  onClick,
  hideLabels = false,
}: DayColumnProps) {
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [clickedEntryId, setClickedEntryId] = useState<string | null>(null);

  // Sort entries by startTime ascending (earliest first = bottom of stack)
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const totalMinutes = sorted.reduce((sum, e) => sum + e.durationMinutes, 0);
  const totalHours = totalMinutes / 60;
  const maxMinutes = maxHoursDisplay * 60;
  const targetPercent = (hoursPerDay / maxHoursDisplay) * 100;

  const handleEntryClick = (entryId: string) => {
    setClickedEntryId(clickedEntryId === entryId ? null : entryId);
    onClick?.();
  };

  return (
    <div
      className="flex flex-col items-center cursor-pointer group"
      onClick={onClick}
    >
      {/* Bar container */}
      <div
        className="relative flex w-full flex-col-reverse overflow-visible bg-white/[0.02] transition-colors group-hover:bg-white/[0.04]"
        style={{ height: `${maxHoursDisplay * 16}px`, minHeight: "80px" }}
      >
        {/* Individual entry blocks */}
        {sorted.map((entry) => {
          const cat = categories.find((c) => c.id === entry.categoryId);
          if (!cat) return null;
          const heightPercent = Math.min(
            (entry.durationMinutes / maxMinutes) * 100,
            100,
          );
          const isHovered = hoveredEntryId === entry.id;
          const isClicked = clickedEntryId === entry.id;

          return (
            <div
              key={entry.id}
              className="relative flex items-center justify-center shrink-0 transition-all"
              style={{
                height: `${heightPercent}%`,
                background: createCoolGradient(cat.color, isHovered),
                minHeight: heightPercent > 0 ? "4px" : "0px",
                boxShadow: isHovered
                  ? `0 0 8px rgba(0, 150, 255, 0.3)`
                  : "none",
              }}
              onMouseEnter={() => setHoveredEntryId(entry.id)}
              onMouseLeave={() => {
                setHoveredEntryId(null);
                setClickedEntryId(null);
              }}
              onClick={() => handleEntryClick(entry.id)}
            >
              {heightPercent > 4 && (
                <span
                  className="text-[10px] font-bold tracking-wider truncate px-0.5"
                  style={{ color: cat.color }}
                >
                  {cat.abbreviation}
                </span>
              )}

              {/* Hover tooltip: title */}
              {isHovered && !isClicked && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-20 pointer-events-none">
                  <div className="rounded bg-black/90 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg border border-white/10">
                    {entry.title || cat.name}
                  </div>
                </div>
              )}

              {/* Click dropdown: details */}
              {isClicked && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30">
                  <div className="rounded-lg bg-black/95 px-3 py-2 text-[11px] text-white shadow-xl border border-white/10 whitespace-nowrap space-y-0.5 min-w-[120px]">
                    <div className="font-medium">
                      {entry.title || "Untitled"}
                    </div>
                    {entry.description && (
                      <div className="text-white/50 text-[10px]">
                        {entry.description}
                      </div>
                    )}
                    <div className="text-white/40 text-[10px]">
                      {entry.durationMinutes}m &middot; {cat.name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Target hours dotted line */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: `${targetPercent}%`,
            borderTop: "1px dashed rgba(255,255,255,0.2)",
          }}
        />
      </div>

      {/* Day label and hours - hidden when too many days */}
      {!hideLabels && (
        <>
          <span
            className={`mt-1 text-[10px] ${isToday ? "text-accent font-bold" : "text-muted"}`}
          >
            {dayLabel}
          </span>
          <span className="text-[10px] font-mono text-muted">
            {totalHours.toFixed(1)}h
          </span>
        </>
      )}
    </div>
  );
}

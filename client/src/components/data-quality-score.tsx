import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface DataQualityScoreProps {
  file?: { id?: string; name?: string; path?: string };
  qualityScore?: number;
  issues?: any[];
  format?: "csv" | "xlsx";
  onExport?: () => void;
}

export function DataQualityScore({
  file,
  qualityScore = 0,
  issues = [],
  format = "csv",
  onExport,
}: DataQualityScoreProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const fileId = file?.id;

  // Capture initial total issues ONCE only
  const [initialTotal] = useState(issues.length);

  // Score animation state
  const [displayedScore, setDisplayedScore] = useState(qualityScore);

  // ------- FINAL SCORE LOGIC --------
  const finalScore = useMemo(() => {
    const total = issues.length;

    // If no issues ever OR all fixed → 100
    if (initialTotal === 0 || total === 0) return 100;

    // Normal dynamic scoring
    const resolved = initialTotal - total;
    const dynamicScore = (resolved / initialTotal) * 100;

    return Math.round(dynamicScore);
  }, [issues.length, initialTotal]);

  // -------- SMOOTH ANIMATION --------
  useEffect(() => {
    let animation: number;

    const step = () => {
      setDisplayedScore((prev) => {
        if (prev < finalScore) return Math.min(prev + 1, finalScore);
        if (prev > finalScore) return Math.max(prev - 1, finalScore);
        return prev;
      });

      animation = requestAnimationFrame(step);
    };

    animation = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animation);
  }, [finalScore]);

  // -------- COLOR --------
  const circleColor =
    displayedScore >= 85
      ? "text-green-500"
      : displayedScore >= 60
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="p-4 bg-transparent transition-all duration-700 ease-in-out">
      <div className="flex items-center justify-between">

        {/* Score Circle */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90 transition-all duration-700 ease-out"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r={radius}
                strokeWidth="6"
                fill="none"
                className="text-gray-300 dark:text-gray-700"
                stroke="currentColor"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - displayedScore / 100)}
                className={`${circleColor} transition-all duration-700 ease-in-out`}
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>

            <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(displayedScore)}%
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Quality Score
          </h3>
        </div>

        {/* Export */}
        <Button
          onClick={onExport}
          disabled={!fileId}
          className={`mt-3 rounded-lg px-4 py-2 text-white flex items-center gap-2 transition-colors ${
            fileId
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          <Download size={16} />
          Export Cleaned {format === "csv" ? "CSV" : "Excel"}
        </Button>
      </div>
    </div>
  );
}

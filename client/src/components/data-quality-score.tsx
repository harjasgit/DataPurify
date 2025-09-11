import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";



interface DataQualityScoreProps {
  file?: {
    id?: string;
    name?: string;
    path?: "";
  }; 
  qualityScore?: number; // backend-driven score
  format?: "csv" | "xlsx"; 
  issues?: any[];
  onExport?: () => void; // Parent-provided export handler
}

export function DataQualityScore({ file, qualityScore , format = "csv", onExport }: DataQualityScoreProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

 // Determine file identifier for export
  const fileId = file?.id ;

  // Circle color logic
  let circleColor = "text-red-500";
  if (qualityScore !== undefined) {
    if (qualityScore >= 80) circleColor = "text-green-500";
    else if (qualityScore >= 50) circleColor = "text-yellow-500";
  }
  

  return (
    <div className="p-4 bg-transparent">
      <div className="flex items-center justify-between">
        {/* Score Circle */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                strokeWidth="6"
                fill="none"
                className="text-gray-300 dark:text-gray-700"
                stroke="currentColor"
              />
              {/* Foreground Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={
                  circumference * (1 - (qualityScore ?? 0) / 100)
                }
                className={circleColor}
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
              {qualityScore !== undefined ? `${qualityScore}%` : "--%"}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Quality Score
          </h3>
        </div>
           
        {/* Export Button */}
        <Button
          onClick={onExport}
          className={`mt-3 rounded-lg px-4 py-2 text-white ${
            fileId ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!fileId}
        >
          <Download size={16} />
          Export Cleaned {format === "csv" ? "CSV" : "Excel"}
        </Button>
      </div>
    </div>
  );
}

// worker/recordLinkWorker.ts
import { parentPort, workerData } from "worker_threads";

// FIX: natural is CommonJS → must import as default
import naturalPkg from "natural";
const { JaroWinklerDistance, LevenshteinDistance } = naturalPkg;

// ------------------------------------
// TYPES
// ------------------------------------
interface RowData {
  [key: string]: any;
}
interface Mapping {
  [key: string]: string;
}
interface WorkerInput {
  fileAData: RowData[];
  fileBData: RowData[];
  mapping: Mapping;
  mode: "basic" | "advanced" | "strict";
}

interface MatchResult {
  rowA: RowData;
  rowB: RowData | null;
  similarity: number;
}

// ------------------------------------
// NORMALIZATION
// ------------------------------------
const normalize = (value: any): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// ------------------------------------
// ALGORITHMS
// ------------------------------------

// Basic fuzzy
const basicSim = (a: string, b: string): number => {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const len = Math.max(a.length, b.length);
  let matches = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / len;
};

// Jaro–Winkler
const jwSim = (a: string, b: string): number => JaroWinklerDistance(a, b);

// Levenshtein
const levSim = (a: string, b: string): number => {
  const dist = LevenshteinDistance(a, b) ?? a.length;
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
};

// Hybrid
const hybridSim = (a: string, b: string): number =>
  (basicSim(a, b) + jwSim(a, b) + levSim(a, b)) / 3;

// ------------------------------------
// BATCH PROCESSING
// ------------------------------------
const BATCH_SIZE = 500;

function matchBatched(
  fileA: RowData[],
  fileB: RowData[],
  mapping: Mapping,
  mode: WorkerInput["mode"]
) {
  const results: MatchResult[] = [];
  const similarities: number[] = [];

  const similarityFn =
    mode === "strict" ? levSim : mode === "advanced" ? hybridSim : basicSim;

  // Pre-normalize fileB
  const fileBNorm = fileB.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, normalize(v)])
    )
  );

  for (let start = 0; start < fileA.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, fileA.length);
    const batch = fileA.slice(start, end);

    for (const rowA of batch) {
      let best: RowData | null = null;
      let bestScore = 0;

      const rowANorm = Object.fromEntries(
        Object.entries(rowA).map(([k, v]) => [k, normalize(v)])
      );

      for (let i = 0; i < fileB.length; i++) {
        const rowB = fileB[i];
        const rowBN = fileBNorm[i];

        let scoreTotal = 0;
        let count = 0;

        for (const [colA, colB] of Object.entries(mapping)) {
          const vA = rowANorm[colA];
          const vB = rowBN[colB];

          if (!vA || !vB) continue;

          const score = similarityFn(vA, vB);
          scoreTotal += score;
          count++;
        }

        if (count === 0) continue;

        const avg = scoreTotal / count;
        similarities.push(avg);

        if (avg > bestScore) {
          bestScore = avg;
          best = rowB;
        }
      }

      results.push({
        rowA,
        rowB: best,
        similarity: bestScore,
      });
    }
  }

  return { rawMatches: results, similarities };
}

// ------------------------------------
// CLASSIFICATION
// ------------------------------------
function classifyResults(
  rawMatches: MatchResult[],
  similarities: number[],
  mode: WorkerInput["mode"]
) {
  const max = similarities.length ? Math.max(...similarities) : 1;
  const min = similarities.length ? Math.min(...similarities) : 0;
  const range = max - min || 0.01;

  const EXACT = mode === "strict" ? 0.95 : min + 0.7 * range;
  const POSSIBLE = mode === "strict" ? 0.85 : min + 0.4 * range;

  const exact: any[] = [];
  const possible: any[] = [];
  const unmatched: RowData[] = [];

  for (const m of rawMatches) {
    if (!m.rowB || m.similarity < POSSIBLE) unmatched.push(m.rowA);
    else if (m.similarity >= EXACT)
      exact.push({ ...m, matchType: "Exact" });
    else
      possible.push({ ...m, matchType: "Possible" });
  }

  return { exact, possible, unmatched, thresholds: { exact: EXACT, possible: POSSIBLE } };
}

// ------------------------------------
// WORKER MAIN
// ------------------------------------
const { fileAData, fileBData, mapping, mode } = workerData as WorkerInput;

const { rawMatches, similarities } = matchBatched(
  fileAData,
  fileBData,
  mapping,
  mode
);

const final = classifyResults(rawMatches, similarities, mode);

// ------------------------------------
// SEND RESULT
// ------------------------------------
parentPort?.postMessage({
  ...final,
  summary: {
    fileA: fileAData.length,
    fileB: fileBData.length,
    exact: final.exact.length,
    possible: final.possible.length,
    unmatched: final.unmatched.length,
  },
  modeUsed: mode,
});

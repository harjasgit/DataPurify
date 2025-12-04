// worker/recordLinkWorker.ts
import { parentPort, workerData } from "worker_threads";
import naturalPkg from "natural";
const {
  JaroWinklerDistance,
  LevenshteinDistance,
  Metaphone: NaturalMetaphone,
  SoundEx: NaturalSoundEx,
} = naturalPkg as any;

// ----------------------------- TYPES
interface RowData { [key: string]: any; }
interface Mapping { [key: string]: string; }
interface WorkerInput {
  fileAData: RowData[];
  fileBData: RowData[];
  mapping: Mapping;
  mode: "basic" | "advanced" | "strict";
  // optional: customWeights?: Record<string, number>;
}
interface MatchResult {
  rowA: RowData;
  rowB: RowData | null;
  similarity: number;
  compVector?: Record<string, number>;
}

// ----------------------------- NORMALIZATION UTILITIES
const normalizeRaw = (value: any): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u00A0/g, " ")
    .replace(/[^\w\s@.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTokens = (value: any): string =>
  normalizeRaw(value)
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");

const normalizeNumber = (value: any): string =>
  String(value ?? "").replace(/\D/g, "");

const extractEmailDomain = (email: string): string => {
  const e = (String(email || "").trim().toLowerCase());
  if (!e) return "";
  const at = e.indexOf("@");
  if (at === -1) return "";
  return e.slice(at + 1);
};

// safe phonetic wrapper (natural exports differ across versions)
const phoneticCode = (s: string) => {
  try {
    if (NaturalMetaphone && typeof NaturalMetaphone.process === "function") return NaturalMetaphone.process(s || "");
    if (NaturalSoundEx && typeof NaturalSoundEx.process === "function") return NaturalSoundEx.process(s || "");
  } catch (e) {}
  return String(s || "");
};

// ----------------------------- SIMILARITY FUNCTIONS
const safeJW = (a: string, b: string) => {
  if (!a || !b) return 0;
  try { return JaroWinklerDistance(a, b); } catch { return 0; }
};
const safeLevRatio = (a: string, b: string) => {
  if (!a || !b) return 0;
  const d = LevenshteinDistance(a, b) ?? Math.max(a.length, b.length);
  const max = Math.max(a.length, b.length) || 1;
  return 1 - d / max;
};

// token similarity (Jaccard-like on tokens)
const tokenSim = (a: string, b: string) => {
  if (!a || !b) return 0;
  const A = new Set(a.split(" ").filter(Boolean));
  const B = new Set(b.split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
};

// Token Sort Ratio (fuzzywuzzy token_sort_ratio style)
// Implemented as Levenshtein ratio on sorted-token strings
const tokenSortRatio = (aRaw: string, bRaw: string) => {
  const a = normalizeTokens(aRaw);
  const b = normalizeTokens(bRaw);
  if (!a || !b) return 0;
  return safeLevRatio(a, b);
};

// Cosine similarity on token frequency vectors (lightweight TF cosine)
// Good for slightly longer text like addresses
const cosineSim = (aRaw: string, bRaw: string) => {
  const a = normalizeRaw(aRaw);
  const b = normalizeRaw(bRaw);
  if (!a || !b) return 0;

  const toksA = a.split(" ").filter(Boolean);
  const toksB = b.split(" ").filter(Boolean);
  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};

  for (const t of toksA) freqA[t] = (freqA[t] || 0) + 1;
  for (const t of toksB) freqB[t] = (freqB[t] || 0) + 1;

  const allTokens = new Set<string>([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const token of allTokens) {
    const va = freqA[token] || 0;
    const vb = freqB[token] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const phoneticSim = (a: string, b: string) => {
  if (!a || !b) return 0;
  return phoneticCode(a) === phoneticCode(b) ? 1 : 0;
};

// Advanced hybrid (JW + Lev + tokenSort + cosine + phonetic)
const hybridAdvanced = (aRaw: string, bRaw: string) => {
  const a = normalizeRaw(aRaw);
  const b = normalizeRaw(bRaw);
  if (!a || !b) return 0;

  const jw = safeJW(a, b);
  const lv = safeLevRatio(a, b);
  const tSort = tokenSortRatio(aRaw, bRaw);
  const cos = cosineSim(aRaw, bRaw);
  const ph = phoneticSim(a, b);

  // weights tuned for names/addresses: tweak as needed
  return 0.30 * jw + 0.25 * lv + 0.20 * tSort + 0.15 * cos + 0.10 * ph;
};

// existing hybrid used earlier (kept for compatibility)
const hybridFieldSim = (aRaw: string, bRaw: string) => {
  const a = normalizeRaw(aRaw);
  const b = normalizeRaw(bRaw);
  if (!a || !b) return 0;

  const jw = safeJW(a, b);
  const lv = safeLevRatio(a, b);
  const tok = tokenSim(normalizeTokens(a), normalizeTokens(b));
  const ph = phoneticSim(a, b);

  return 0.4 * jw + 0.3 * lv + 0.2 * tok + 0.1 * ph;
};

// ----------------------------- DEFAULT WEIGHTS (can be extended)
const DEFAULT_WEIGHTS: Record<string, number> = {
  email: 4,
  username: 3,
  id: 5,
  name: 3,
  full_name: 3,
  first_name: 2,
  last_name: 2,
  phone: 3,
  mobile: 3,
  address: 1.5,
  city: 1,
  state: 1,
  postcode: 1,
  default: 1,
};

function getWeightForColumn(colName: string) {
  const key = String(colName || "").toLowerCase();
  // check for tokens rather than exact equality
  for (const token of Object.keys(DEFAULT_WEIGHTS)) {
    if (token === "default") continue;
    if (key.includes(token)) return DEFAULT_WEIGHTS[token];
  }
  return DEFAULT_WEIGHTS.default;
}

// ----------------------------- BLOCKING / INDEXING
const buildBlocksByKey = (rows: RowData[], keyCandidates: string[]) => {
  const blocks = new Map<string, RowData[]>();
  for (const r of rows) {
    let key = "all";
    for (const kc of keyCandidates) {
      if (!kc) continue;
      const v = normalizeRaw(r[kc]);
      if (v) { key = v[0] || "all"; break; }
    }
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key)!.push(r);
  }
  return blocks;
};

const buildEmailDomainBlocks = (rows: RowData[], emailCols: string[]) => {
  const blocks = new Map<string, RowData[]>();
  for (const r of rows) {
    let domain = "";
    for (const c of emailCols) {
      domain = extractEmailDomain(r[c] || "");
      if (domain) break;
    }
    const key = domain || "nodomain";
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key)!.push(r);
  }
  return blocks;
};

// ----------------------------- MATCHING (uses blocking to limit comparisons)
// NOTE: for very large datasets you should add additional blocking or sample B per block
const MAX_CANDIDATES_PER_A = 2000; // safety cap — tune for your environment

function matchWithBlocking(
  fileA: RowData[],
  fileB: RowData[],
  mapping: Mapping,
  mode: WorkerInput["mode"]
) {
  const results: MatchResult[] = [];
  const similarities: number[] = [];
  const compVectors: Record<string, number>[] = [];

  // prepare normalized versions of B for speed (useful if you want)
  const fileBNorm = fileB.map(r => {
    const out: RowData = {};
    for (const k of Object.keys(r)) out[k] = r[k] == null ? "" : String(r[k]);
    return out;
  });

  const aCols = Object.keys(mapping);
  const bCols = Object.values(mapping);

  const nameCols = aCols.filter(c => /name/i.test(c)).concat(bCols.filter(c => /name/i.test(c)));
  const emailCols = aCols.filter(c => /email/i.test(c)).concat(bCols.filter(c => /email/i.test(c)));

  const bEmailBlocks = buildEmailDomainBlocks(fileB, emailCols);
  const aEmailBlocks = buildEmailDomainBlocks(fileA, emailCols);

  const aBlocks = buildBlocksByKey(fileA, nameCols);
  const bBlocks = buildBlocksByKey(fileB, nameCols);

  // choose similarity function by mode (used for fallback/default)
  const simMode = mode === "strict" ? safeLevRatio : mode === "advanced" ? hybridAdvanced : tokenSim;

  for (const [blockKey, aRows] of aBlocks) {
    const bCandidates1 = bBlocks.get(blockKey) || [];

    // For the block, create a candidate pool (union of name-block + any domain blocks)
    const bCandidatesForBlockSet = new Set<RowData>(bCandidates1);

    for (const aRow of aRows) {
      // collect domain-based candidates for this aRow
      let domain = "";
      for (const c of emailCols) { domain = extractEmailDomain(aRow[c] || ""); if (domain) break; }
      if (domain) {
        const byDomain = bEmailBlocks.get(domain) || [];
        for (const r of byDomain) bCandidatesForBlockSet.add(r);
      }
    }

    // convert to array; if empty fallback to smaller sample of fileB (not whole file)
    let bCandidates = Array.from(bCandidatesForBlockSet);
    if (!bCandidates.length) {
      // pick a small sampled candidate set to avoid O(N^2) blowup
      bCandidates = fileB.slice(0, Math.min(fileB.length, 2000));
    }

    // safety cap per A row (avoid huge loops)
    if (bCandidates.length > MAX_CANDIDATES_PER_A) {
      bCandidates = bCandidates.slice(0, MAX_CANDIDATES_PER_A);
    }

    for (const rowA of aRows) {
      let best: RowData | null = null;
      let bestScore = 0;
      let bestVec: Record<string, number> = {};

      // precompute normalized tokens for rowA fields
      const aNorm: Record<string, string> = {};
      for (const k of aCols) aNorm[k] = normalizeRaw(rowA[k]);

      for (let i = 0; i < bCandidates.length; i++) {
        const rowB = bCandidates[i];

        let scoreTotal = 0;
        let weightTotal = 0;
        const compVector: Record<string, number> = {};

        for (const [colA, colB] of Object.entries(mapping)) {
          const rawA = aNorm[colA] ?? "";
          const rawB = normalizeRaw(rowB[colB]);

          if (!rawA && !rawB) continue;

          let fieldScore = 0;
          const weight = getWeightForColumn(colA);

          const colLower = String(colA).toLowerCase();

          if (/email/i.test(colLower)) {
            const dA = extractEmailDomain(rawA);
            const dB = extractEmailDomain(rawB);
            fieldScore = (rawA && rawA === rawB) ? 1 : (dA && dB && dA === dB ? 0.9 : hybridAdvanced(rawA, rawB));
          } else if (/phone|mobile|tel|contact|id|ssn/i.test(colLower)) {
            const nA = normalizeNumber(rawA);
            const nB = normalizeNumber(rawB);
            fieldScore = nA && nB ? (nA === nB ? 1 : safeLevRatio(nA, nB)) : hybridAdvanced(rawA, rawB);
          } else if (/name|full_name|first_name|last_name/i.test(colLower)) {
            // use token-sort + hybridAdvanced for names
            fieldScore = hybridAdvanced(normalizeTokens(rawA), normalizeTokens(rawB));
          } else if (/address|addr|street|road|lane/i.test(colLower)) {
            // address: prefer cosine + tokenSort
            const cos = cosineSim(rawA, rawB);
            const tSort = tokenSortRatio(rawA, rawB);
            fieldScore = Math.max(cos, tSort, hybridAdvanced(rawA, rawB));
          } else {
            fieldScore = simMode(rawA, rawB);
          }

          compVector[colA] = Number(fieldScore.toFixed(3));
          scoreTotal += fieldScore * weight;
          weightTotal += weight;
        } // end per-mapped-field

        if (weightTotal === 0) continue;
        const avg = scoreTotal / weightTotal;
        similarities.push(avg);

        if (avg > bestScore) {
          bestScore = avg;
          best = rowB;
          bestVec = compVector;
        }
      } // end iterate bCandidates

      results.push({ rowA, rowB: best, similarity: bestScore, compVector: bestVec });
      compVectors.push(bestVec);
    } // end for rowA
  } // end for block

  return { rawMatches: results, similarities, comparisonVectors: compVectors };
}

// ----------------------------- CLASSIFICATION (deterministic thresholds)
function classifyResults(
  rawMatches: MatchResult[],
  mode: WorkerInput["mode"]
) {
  const EXACT = mode === "strict" ? 0.95 : 0.90;
  const POSSIBLE = mode === "strict" ? 0.85 : 0.75;

  const exact: any[] = [];
  const possible: any[] = [];
  const unmatched: RowData[] = [];

  for (const m of rawMatches) {
    if (!m.rowB || m.similarity < POSSIBLE) unmatched.push(m.rowA);
    else if (m.similarity >= EXACT) exact.push({ ...m, matchType: "Exact" });
    else possible.push({ ...m, matchType: "Possible" });
  }

  return { exact, possible, unmatched, thresholds: { exact: EXACT, possible: POSSIBLE } };
}

// ----------------------------- WORKER MAIN
const { fileAData, fileBData, mapping, mode } = workerData as WorkerInput;

const { rawMatches, similarities, comparisonVectors } = matchWithBlocking(fileAData, fileBData, mapping, mode);

const final = classifyResults(rawMatches, mode);

// ----------------------------- SUMMARY + SEND
parentPort?.postMessage({
  ...final,
  summary: {
    fileA: fileAData.length,
    fileB: fileBData.length,
    exact: final.exact.length,
    possible: final.possible.length,
    unmatched: final.unmatched.length,
    topSimilaritiesSample: similarities.slice(0, 10),
  },
  modeUsed: mode,
});

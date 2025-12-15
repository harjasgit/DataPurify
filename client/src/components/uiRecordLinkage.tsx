// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import { useRoute } from "wouter";
// import { FieldMappingSection } from "@/components/feildMappingSection";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import {
//   FileSpreadsheet,
//   Link2,
//   Loader2,
//   AlertTriangle,
//   Download,
//   Brain,
//   Gauge,
//   ShieldCheck,
// } from "lucide-react";
// import Papa from "papaparse";
// import "@/index.css";
// import { useUser } from "@/context/userContext";

// const RecordUI: React.FC = () => {
//   const [match, params] = useRoute("/record-linkage/:id");
//   const id = params?.id;

//   const [fileAData, setFileAData] = useState<any[]>([]);
//   const [fileBData, setFileBData] = useState<any[]>([]);
//   const [exactMatches, setExactMatches] = useState<any[]>([]);
//   const [possibleMatches, setPossibleMatches] = useState<any[]>([]);
//   const [unmatched, setUnmatched] = useState<any[]>([]);
//   const [mapping, setMapping] = useState<Record<string, string>>({});
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [summary, setSummary] = useState<any>(null);
//   const [mode, setMode] = useState("default"); // smart / advanced / strict
//   const matchesRef = useRef<HTMLDivElement>(null);

//   /* -------------------- FETCH FILES -------------------- */
//   useEffect(() => {
//     if (!id) return setError("Invalid or missing record linkage ID.");
//     const controller = new AbortController();

//     const fetchFiles = async () => {
//       try {
//         const res = await axios.get(
//           `${import.meta.env.VITE_API_URL}/api/record-linkage/${id}`,
//           { signal: controller.signal }
//         );
//         setFileAData(res.data.fileAData || []);
//         setFileBData(res.data.fileBData || []);
//       } catch (err) {}
//     };

//     fetchFiles();
//     return () => controller.abort();
//   }, [id]);

//   /* -------------------- RUN RECORD LINKAGE -------------------- */
//   const handleLinkage = async () => {
//     if (!fileAData.length || !fileBData.length)
//       return setError("No data found in uploaded files.");
//     if (Object.keys(mapping).length === 0)
//       return setError("Please map at least one field before running linkage.");

//     setLoading(true);
//     setError(null);

//     try {
//       const res = await axios.post(
//         `${import.meta.env.VITE_API_URL}/api/record-linkage/run`,
//         { id, mapping, mode }
//       );

//       const { exact, possible, unmatched, summary } = res.data;
//       setExactMatches(exact || []);
//       setPossibleMatches(possible || []);
//       setUnmatched(unmatched || []);
//       setSummary(summary || null);

//       setTimeout(() => matchesRef.current?.scrollIntoView({ behavior: "smooth" }), 500);
//     } catch (err) {
//       setError("Record linkage failed. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* -------------------- EXPORT CSV -------------------- */
//   const exportCSV = (data: any[], filename: string) => {
//     if (!data.length) return;
//     const csv = Papa.unparse(data);
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = `${filename}.csv`;
//     link.click();
//   };

//   /* -------------------- COLOR CODE SIMILARITY -------------------- */
//   const getSimilarityColor = (val: number) => {
//     if (val >= 0.9) return "text-green-500 font-semibold";
//     if (val >= 0.7) return "text-yellow-500 font-semibold";
//     return "text-red-500 font-semibold";
//   };

//   /* -------------------- RENDER TABLE -------------------- */
//   const renderTable = (data: any[]) => {
//     if (!data.length)
//       return (
//         <div className="text-muted-foreground italic text-center p-4 border border-border rounded-md">
//           No data found
//         </div>
//       );

//     const columns = Object.keys(data[0]);
//     const visibleRows = 50;

//     return (
//       <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
//         <div className="overflow-x-auto overflow-y-auto max-h-[500px] no-scrollbar scroll-smooth">
//           <table className="min-w-full text-sm text-foreground">
//             <thead className="bg-muted text-muted-foreground sticky top-0">
//               <tr>
//                 {columns.map((col) => (
//                   <th
//                     key={col}
//                     className="border border-border px-3 py-2 text-left font-medium whitespace-nowrap"
//                   >
//                     {col}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {data.slice(0, visibleRows).map((row, idx) => (
//                 <tr key={idx} className="hover:bg-accent transition-colors">
//                   {columns.map((col) => (
//                     <td
//                       key={col}
//                       className="border border-border px-3 py-2 whitespace-nowrap"
//                     >
//                       {String(row[col] ?? "-")}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         <p className="text-xs text-muted-foreground mt-2 text-center">
//           Showing first {Math.min(visibleRows, data.length)} of {data.length} records
//         </p>
//       </div>
//     );
//   };

//   /* -------------------- MATCH TABLE -------------------- */
//   const renderMatches = (matches: any[], label: string) => {
//     if (!matches.length)
//       return <div className="text-muted-foreground italic text-center p-4">No records</div>;

//     const columns = Object.keys(matches[0].rowA || {});
//     const visibleRows = 50;

//     return (
//       <div>
//         <div className="flex justify-between items-center mb-3">
//           <h3 className="font-semibold">
//             {label} ({matches.length})
//           </h3>
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() =>
//               exportCSV(
//                 matches.map((m) => ({
//                   ...m.rowA,
//                   ...m.rowB,
//                   similarity: m.similarity,
//                 })),
//                 `${label}-matches`
//               )
//             }
//           >
//             <Download className="w-4 h-4 mr-2" /> Export CSV
//           </Button>
//         </div>

//         <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar scroll-smooth rounded-lg border border-border bg-card shadow-sm">
//           <table className="min-w-full text-sm text-foreground">
//             <thead className="bg-muted text-muted-foreground sticky top-0">
//               <tr>
//                 {columns.map((col) => (
//                   <th
//                     key={col}
//                     className="border border-border px-3 py-2 text-left font-medium whitespace-nowrap"
//                   >
//                     {col}
//                   </th>
//                 ))}
//                 <th className="border border-border px-3 py-2 text-center font-medium whitespace-nowrap">
//                   Similarity
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {matches.slice(0, visibleRows).map((m, idx) => (
//                 <tr key={idx} className="hover:bg-accent transition-colors">
//                   {columns.map((col) => (
//                     <td key={col} className="border border-border px-3 py-2 whitespace-nowrap">
//                       {String(m.rowA[col] ?? "-")} ↔ {String(m.rowB[col] ?? "-")}
//                     </td>
//                   ))}
//                   <td
//                     className={`border border-border px-3 py-2 text-center ${getSimilarityColor(
//                       Number(m.similarity)
//                     )}`}
//                   >
//                     {m.similarity !== undefined && m.similarity !== null
//                       ? Number(m.similarity).toFixed(2)
//                       : "N/A"}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         <p className="text-xs text-muted-foreground mt-2 text-center">
//           Showing first {Math.min(visibleRows, matches.length)} of {matches.length} matches
//         </p>
//       </div>
//     );
//   };

//   /* -------------------- MAIN -------------------- */
//   return (
//     <div className="min-h-screen bg-background text-foreground p-8 transition-colors relative">
//       <h1 className="text-3xl font-bold mb-6 text-center">Record Linkage Dashboard</h1>

//       {error && (
//         <div className="bg-destructive text-destructive-foreground border border-border p-3 rounded-md mb-6 text-center">
//           {error}
//         </div>
//       )}

//       {/* Algorithm Mode Selector */}
//       <div className="flex justify-center gap-4 mb-8 relative">

//         <Button
//           variant={mode === "default" ? "default" : "outline"}
//           onClick={() => setMode("default")}
//         >
//           <Brain className="w-4 h-4 mr-2" /> Smart Match
//         </Button>

//         <Button
//           variant={mode === "advanced" ? "default" : "outline"}
//           onClick={() => setMode("advanced")}
//         >
//           <Gauge className="w-4 h-4 mr-2" /> Advanced Match
//         </Button>

//         <Button
//           variant={mode === "strict" ? "default" : "outline"}
//           onClick={() => setMode("strict")}
//         >
//           <ShieldCheck className="w-4 h-4 mr-2" /> Strict Match
//         </Button>
//       </div>

//       {/* File Tables */}
//       {fileAData.length > 0 && fileBData.length > 0 && (
//         <div className="grid md:grid-cols-2 gap-6 mb-10">
//           {renderTable(fileAData)}
//           {renderTable(fileBData)}
//         </div>
//       )}

//       {/* Field Mapping Section */}
//       {fileAData.length > 0 && fileBData.length > 0 && (
//         <div className="mt-8">
//           <FieldMappingSection
//             fileAHeaders={Object.keys(fileAData[0])}
//             fileBHeaders={Object.keys(fileBData[0])}
//             onMappingChange={setMapping}
//           />
//         </div>
//       )}

//       <div className="flex justify-center mt-10">
//         <Button
//           onClick={handleLinkage}
//           disabled={loading || !fileAData.length || !fileBData.length}
//           className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
//         >
//           {loading ? (
//             <>
//               <Loader2 className="animate-spin mr-2" /> Processing...
//             </>
//           ) : (
//             <>
//               <Link2 className="mr-2" /> Run Record Linkage
//             </>
//           )}
//         </Button>
//       </div>

//       <div ref={matchesRef} className="mt-12 space-y-6">
//         {summary && (
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <SummaryCard icon={<FileSpreadsheet />} label="Total File A" value={summary.fileA} />
//             <SummaryCard icon={<FileSpreadsheet />} label="Total File B" value={summary.fileB} />
//             <SummaryCard icon={<Link2 />} label="Exact Matches" value={summary.exact} />
//             <SummaryCard icon={<AlertTriangle />} label="Possible Matches" value={summary.possible} />
//           </div>
//         )}

//         <Tabs defaultValue="exact" className="mt-6">
//           <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-4">
//             <TabsTrigger value="exact">Exact Matches</TabsTrigger>
//             <TabsTrigger value="possible">Possible Matches</TabsTrigger>
//             <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
//           </TabsList>

//           <TabsContent value="exact">{renderMatches(exactMatches, "Exact Matches")}</TabsContent>
//           <TabsContent value="possible">{renderMatches(possibleMatches, "Possible Matches")}</TabsContent>
//           <TabsContent value="unmatched">{renderMatches(unmatched, "Unmatched Records")}</TabsContent>
//         </Tabs>
//       </div>

//       {loading && (
//         <div className="fixed inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm z-50">
//           <div className="bg-card text-card-foreground p-6 rounded-xl shadow-lg flex items-center space-x-3">
//             <Loader2 className="animate-spin w-5 h-5" />
//             <p className="text-lg font-semibold">Running Record Linkage...</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// /* -------------------- SUMMARY CARD -------------------- */
// const SummaryCard = ({
//   icon,
//   label,
//   value,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: number;
// }) => (
//   <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition">
//     <div className="text-primary mb-2">{icon}</div>
//     <p className="text-sm text-muted-foreground">{label}</p>
//     <p className="text-xl font-bold">{value}</p>
//   </div>
// );

// export default RecordUI;

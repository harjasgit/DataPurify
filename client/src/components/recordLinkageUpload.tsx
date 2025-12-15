// import { useState } from "react";
// import { useDropzone } from "react-dropzone";
// import { useLocation } from "wouter";
// import { Button } from "@/components/ui/button";
// import { FileSpreadsheet, Upload } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";

// interface RecordLinkageUploadProps {
//   onFilesUpload?: (files: { fileA?: File; fileB?: File }) => void;
// }

// export function RecordLinkageUpload({ onFilesUpload }: RecordLinkageUploadProps) {
//   const [fileA, setFileA] = useState<File | null>(null);
//   const [fileB, setFileB] = useState<File | null>(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const { toast } = useToast();
//   const [, navigate] = useLocation();

//   const handleUpload = async () => {
//     if (!fileA || !fileB) {
//       toast({
//         title: "Missing files",
//         description: "Upload both files",
//         variant: "destructive",
//       });
//       return;
//     }

//     // 🔹 Trigger callback for parent modal if defined
//     if (onFilesUpload) {
//       onFilesUpload({ fileA, fileB });
//     }

//     setIsUploading(true);
//     try {
//       const formData = new FormData();
//       formData.append("fileA", fileA);
//       formData.append("fileB", fileB);

//       console.log("📤 Uploading Record Linkage files...");
//       const response = await fetch(
//         `${import.meta.env.VITE_API_URL}/api/upload/record-linkage`,
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

//       const data = await response.json();
//       console.log("Server response:", data);

//       if (!response.ok || !data?.record_linkage_id)
//         throw new Error("Missing record_linkage_id");

//       toast({ title: "Upload successful 🎉", description: "Redirecting..." });
//       navigate(`/record-linkage/${data.record_linkage_id}`);
//     } catch (err) {
//       console.error("Upload error:", err);
//       toast({
//         title: "Upload failed",
//         description: "Error uploading files",
//         variant: "destructive",
//       });
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // 🧩 Create dropzones for File A and File B
//   const createDropzone = (onDrop: (files: File[]) => void) =>
//     useDropzone({
//       onDrop,
//       accept: {
//         "text/csv": [".csv"],
//         "application/vnd.ms-excel": [".xls"],
//         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
//           ".xlsx",
//         ],
//       },
//       multiple: false,
//     });

//   const { getRootProps: getRootA, getInputProps: getInputA } = createDropzone(
//     (files) => setFileA(files[0])
//   );
//   const { getRootProps: getRootB, getInputProps: getInputB } = createDropzone(
//     (files) => setFileB(files[0])
//   );

//  return (
//   <div className="w-full">

//     {/* Outer Dashed Box */}
//     <div className="border-2 border-dashed border-[#9b5cff] rounded-2xl p-10">

//       {/* Title */}
//       <h2 className="text-center text-xl font-semibold text-white mb-2">
//         Upload Your Records
//       </h2>

//       <p className="text-center text-white/70 mb-10">
//         Drag & drop CSV/XLSX files here or click to upload.
//       </p>

//       {/* Upload Boxes */}
//       <div className="grid grid-cols-2 gap-8">

//         {/* File A Box */}
//         <div
//           {...getRootA()}
//           className="border border-white/10 hover:border-[#9b5cff] transition rounded-xl p-8 bg-[#111318] cursor-pointer flex flex-col items-center justify-center"
//         >
//           <input {...getInputA()} />
//           <FileSpreadsheet className="h-12 w-12 text-white mb-3" />
//           <p className="text-white font-medium">
//             {fileA ? fileA.name : "Upload Record A"}
//           </p>
//         </div>

//         {/* File B Box */}
//         <div
//           {...getRootB()}
//           className="border border-white/10 hover:border-[#9b5cff] transition rounded-xl p-8 bg-[#111318] cursor-pointer flex flex-col items-center justify-center"
//         >
//           <input {...getInputB()} />
//           <FileSpreadsheet className="h-12 w-12 text-white mb-3" />
//           <p className="text-white font-medium">
//             {fileB ? fileB.name : "Upload Record B"}
//           </p>
//         </div>

//       </div>

//       {/* Upload Button */}
//       <div className="flex justify-center mt-10">
//         <Button
//           onClick={handleUpload}
//           disabled={isUploading}
//           className="px-6 py-5 rounded-xl bg-[#9b5cff] hover:bg-[#874aff] text-white font-semibold"
//         >
//           <Upload className="w-4 h-4 mr-2" />
//           {isUploading ? "Processing..." : "Upload Both"}
//         </Button>
//       </div>

//     </div>
//   </div>
// );

// }

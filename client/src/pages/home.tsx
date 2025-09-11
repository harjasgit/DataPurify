import { useState } from "react";
import { FileUploadZone } from "@/components/file-upload-zone";
import { DataPreviewTable } from "@/components/data-preview-table";
import { SuggestionsSidebar } from "@/components/suggestions-sidebar";
import { DataQualityScore } from "@/components/data-quality-score";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Database } from "lucide-react";
import CardsSection from "@/components/cardsSection";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/footer";

interface FileData {
  id: string;
  filename: string;
  rowCount: number;
  qualityScore: number;
  issues: any[];
  preview: any[];
}

export default function Home() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [smartPreview, setSmartPreview] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleFileUpload = (data: FileData) => {
    setFileData(data);
    toast({
      title: "File uploaded successfully!",
      description: `Analyzed ${data.rowCount} rows with ${data.qualityScore}% quality score.`,
    });
  };

  const handleDataUpdate = (updatedData: Partial<FileData>) => {
    if (fileData) {
      setFileData({ ...fileData, ...updatedData });
    }
  };

  const handleExport = async () => {
    if (!fileData) return;

    try {
      const response = await fetch(`/api/files/${fileData.id}/export?format=csv`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_${fileData.filename}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed!",
        description: "Your cleaned data has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">DataPurify</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
                <Moon className="h-4 w-4" />
              </div>
              <span className="text-sm text-muted-foreground ">Dark Mode</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Main Content */}
        <main className="flex-1">
          <div className="h-full flex flex-col">
            
            {/* Data Quality Score Section */}
            {fileData && (
              <DataQualityScore
                file={{ id: fileData.id, name: fileData.filename, path: "" }}
                qualityScore={fileData.qualityScore}
                issues={fileData.issues}
                onExport={handleExport}
              />
            )}

           <div className="flex-1 p-6 overflow-hidden">
           {!fileData ? (
           <div className="flex flex-col items-center justify-center h-full pt-20">
           {/* Motivational Text */}
           <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 animate-pulse text-foreground">
           Get your data cleaned with just <span className="text-primary">one click!</span>
           </h2>

         {/* Upload Zone */}
      <FileUploadZone onFileUpload={handleFileUpload} />
      {/* Features Cards Section */}
    <div className="mt-16 w-full">
      <CardsSection />
    </div>
   </div>
      ) : (
              
              <div className="h-full flex flex-col">
               <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Data Preview</h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Smart Preview Mode</span>
                      <Switch
                        checked={smartPreview}
                        onCheckedChange={setSmartPreview}
                      />
                    </div>
                  </div>
                  
                  <DataPreviewTable
                    data={fileData.preview}
                    issues={fileData.issues}
                    smartPreview={smartPreview}
                    totalRows={fileData.rowCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Suggestions Sidebar */}
        {fileData && (
          <SuggestionsSidebar
            fileId={fileData.id}
            issues={fileData.issues}
            onDataUpdate={handleDataUpdate}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

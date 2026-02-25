import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileSpreadsheet, Loader2, MessageSquareText, BarChart3, Sparkles } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { toast } from "sonner";
import type { UploadResponse } from "@datachat/shared-types";

export function UploadZone() {
  const [uploading, setUploading] = useState(false);
  const addSession = useAppStore((s) => s.addSession);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejections: FileRejection[]) => {
      // Handle client-side rejections
      if (rejections.length > 0) {
        const rejection = rejections[0];
        const code = rejection.errors[0]?.code;
        if (code === "file-too-large") {
          toast.error("File too large. Maximum size is 10MB.");
        } else if (code === "file-invalid-type") {
          toast.error("Invalid file type. Only CSV and Excel files are supported.");
        } else {
          toast.error(rejection.errors[0]?.message || "File rejected");
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data: UploadResponse = await res.json();
        addSession(data.sessionId, data.schema.filename, data.schema);
        toast.success(`Loaded ${data.schema.filename}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [addSession]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  const features = [
    { icon: MessageSquareText, text: "Ask questions in plain English" },
    { icon: BarChart3, text: "Get instant charts & visualizations" },
    { icon: Sparkles, text: "AI-powered insights from your data" },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8">
      <div className="w-full max-w-xl flex flex-col items-center">
        {/* Hero */}
        <div className="text-center mb-6 md:mb-10">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3 md:mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif", letterSpacing: "0.05em" }}
          >
            <span className="text-primary">Brew</span>
            <span style={{ color: "rgb(240, 183, 18)" }}>lytics</span>
          </h2>
          <p
            className="text-lg md:text-2xl leading-relaxed max-w-lg mx-auto text-muted-foreground font-normal"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Turn your spreadsheets into <em className="font-semibold text-primary not-italic">conversations</em>.
            <br />
            <span className="font-light text-foreground/60">Upload a file, ask anything, and watch your data </span>
            <em className="font-medium text-foreground/80 italic">come alive</em>.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-4 md:mt-6">
            {features.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/8 border border-primary/15 text-xs md:text-sm text-foreground/80"
              >
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upload area */}
        <div className="w-full max-w-lg">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input {...getInputProps()} onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Parsing your file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-primary/10">
                  {isDragActive ? (
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                  ) : (
                    <Upload className="h-10 w-10 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {isDragActive
                      ? "Drop your file here"
                      : "Upload a CSV or Excel file"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag & drop or click to browse. Max 10MB.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

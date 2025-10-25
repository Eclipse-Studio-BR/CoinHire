import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  type: "resume" | "logo";
  onUploadComplete: (url: string) => void;
  currentFile?: string;
  label?: string;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TYPES: Record<"resume" | "logo", string[]> = {
  resume: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  logo: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
};

const ACCEPT_EXTENSIONS: Record<"resume" | "logo", string> = {
  resume: ".pdf,.doc,.docx",
  logo: ".png,.jpg,.jpeg,.webp,.svg",
};

export function FileUpload({
  type,
  onUploadComplete,
  currentFile,
  label,
  className,
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<string | undefined>(currentFile);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isObjectStorageMisconfigured = (error: unknown) => {
    const message =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "";
    return (
      message.includes("PRIVATE_OBJECT_DIR") ||
      message.includes("PUBLIC_OBJECT_SEARCH_PATHS")
    );
  };

  const uploadViaObjectStorage = async (file: File): Promise<string> => {
    const { uploadURL } = await apiRequest("POST", "/api/objects/upload").then((res) => res.json());

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const message = await uploadResponse.text();
      throw new Error(message || "Upload failed");
    }

    const finalizeEndpoint = type === "resume" ? "/api/objects/resume" : "/api/objects/logo";
    const payload = type === "resume" ? { resumeURL: uploadURL } : { logoURL: uploadURL };
    const { objectPath } = await apiRequest("PUT", finalizeEndpoint, payload).then((res) =>
      res.json(),
    );

    return objectPath;
  };

  const uploadViaLocalEndpoint = async (file: File): Promise<string> => {
    if (type !== "logo") {
      throw new Error("Local uploads are only supported for company logos.");
    }
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/logo", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Upload failed");
    }

    const { objectPath } = await response.json();
    return objectPath;
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!MIME_TYPES[type].includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description:
          type === "resume"
            ? "Please upload a PDF or Word document."
            : "Please upload an image (PNG, JPG, WEBP, or SVG).",
        variant: "destructive",
      });
      resetInput();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "The maximum file size is 5MB.",
        variant: "destructive",
      });
      resetInput();
      return;
    }

    try {
      setIsUploading(true);

      let objectPath: string;
      try {
        objectPath = await uploadViaObjectStorage(file);
      } catch (error) {
        if (isObjectStorageMisconfigured(error)) {
          objectPath = await uploadViaLocalEndpoint(file);
        } else {
          throw error;
        }
      }

      setUploadedFile(objectPath);
      onUploadComplete(objectPath);

      toast({
        title: "Upload complete",
        description: `Your ${type === "resume" ? "résumé" : "logo"} has been uploaded.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message ?? "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      resetInput();
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setUploadedFile(undefined);
    onUploadComplete("");
    resetInput();
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}

      {uploadedFile ? (
        <div className="flex items-center gap-3 rounded-md border bg-card p-4">
          {type === "resume" ? (
            <FileText className="h-8 w-8 text-primary" />
          ) : (
            <img src={uploadedFile} alt="Uploaded logo" className="h-12 w-12 rounded object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {type === "resume" ? "Resume uploaded" : "Logo uploaded"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{uploadedFile}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            data-testid="button-remove-file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_EXTENSIONS[type]}
            className="hidden"
            onChange={handleFileSelection}
          />
          <Button
            type="button"
            variant="outline"
            onClick={openFilePicker}
            disabled={isUploading}
            className="mx-auto flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading…" : `Click to upload ${type === "resume" ? "resume" : "logo"}`}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            {type === "resume"
              ? "Accepted formats: PDF, DOC, DOCX (max 5MB)"
              : "Accepted formats: PNG, JPG, WEBP, SVG (max 5MB)"}
          </p>
        </div>
      )}
    </div>
  );
}

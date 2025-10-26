import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type UploadKind = "resume" | "logo" | "avatar";

interface FileUploadProps {
  type: UploadKind;
  onUploadComplete: (url: string) => void;
  currentFile?: string;
  label?: string;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TYPES: Record<UploadKind, string[]> = {
  resume: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  logo: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  avatar: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
};

const ACCEPT_EXTENSIONS: Record<UploadKind, string> = {
  resume: ".pdf,.doc,.docx",
  logo: ".png,.jpg,.jpeg,.webp,.svg",
  avatar: ".png,.jpg,.jpeg,.webp,.svg",
};

const LOCAL_UPLOAD_ENDPOINTS: Partial<Record<UploadKind, string>> = {
  resume: "/api/uploads/resume",
  logo: "/api/uploads/logo",
  avatar: "/api/uploads/avatar",
};

const FINALIZE_TARGETS: Record<UploadKind, { endpoint: string; payloadKey: string }> = {
  resume: { endpoint: "/api/objects/resume", payloadKey: "resumeURL" },
  logo: { endpoint: "/api/objects/logo", payloadKey: "logoURL" },
  avatar: { endpoint: "/api/objects/avatar", payloadKey: "avatarURL" },
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

  useEffect(() => {
    setUploadedFile(currentFile || undefined);
  }, [currentFile]);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    const { endpoint, payloadKey } = FINALIZE_TARGETS[type];
    const payload = { [payloadKey]: uploadURL };
    const { objectPath } = await apiRequest("PUT", endpoint, payload).then((res) =>
      res.json(),
    );

    return objectPath;
  };

  const uploadViaLocalEndpoint = async (file: File): Promise<string> => {
    const endpoint = LOCAL_UPLOAD_ENDPOINTS[type];
    if (!endpoint) {
      throw new Error("Local uploads are not supported for this file type.");
    }
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(endpoint, {
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

      let objectPath: string | null = null;
      let lastError: unknown = null;
      try {
        objectPath = await uploadViaObjectStorage(file);
      } catch (error) {
        lastError = error;
        if (LOCAL_UPLOAD_ENDPOINTS[type]) {
          try {
            objectPath = await uploadViaLocalEndpoint(file);
          } catch (localError) {
            lastError = localError;
          }
        }
      }

      if (!objectPath) {
        throw lastError ?? new Error("Upload failed");
      }

      setUploadedFile(objectPath);
      onUploadComplete(objectPath);

      toast({
        title: "Upload complete",
        description: `Your ${getFriendlyLabel(type)} has been uploaded.`,
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
            <img
              src={uploadedFile}
              alt={`Uploaded ${type === "logo" ? "logo" : "profile photo"}`}
              className="h-12 w-12 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {type === "resume"
                ? "Resume uploaded"
                : type === "logo"
                  ? "Logo uploaded"
                  : "Profile photo updated"}
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
            {isUploading ? "Uploading…" : `Click to upload ${getActionLabel(type)}`}
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

function getFriendlyLabel(kind: UploadKind): string {
  switch (kind) {
    case "resume":
      return "résumé";
    case "logo":
      return "logo";
    default:
      return "profile photo";
  }
}

function getActionLabel(kind: UploadKind): string {
  switch (kind) {
    case "resume":
      return "resume";
    case "logo":
      return "logo";
    default:
      return "photo";
  }
}

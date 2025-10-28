import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublicFileUploadProps {
  type: "avatar" | "logo" | "resume";
  label?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  helperText?: string;
}

const ENDPOINT_MAP: Record<"avatar" | "logo" | "resume", string> = {
  avatar: "/api/uploads/public/avatar",
  logo: "/api/uploads/public/logo",
  resume: "/api/uploads/resume",
};

export function PublicFileUpload({ type, label, value, onChange, helperText }: PublicFileUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(ENDPOINT_MAP[type], {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const message = (await res.text()) || "Upload failed";
        throw new Error(message);
      }

      const { objectPath } = await res.json();
      setPreview(objectPath);
      onChange(objectPath);
      toast({
        title: "Upload complete",
        description: "Your file has been uploaded.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message ?? "Unable to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <input 
        ref={inputRef} 
        type="file" 
        className="hidden" 
        accept={type === "resume" ? ".pdf,.doc,.docx" : "image/*"} 
        onChange={handleFileChange} 
      />
      <Card className="p-4 flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="Uploaded preview" className="h-16 w-16 rounded-lg object-cover border" />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{preview ? "File uploaded" : "No file chosen"}</p>
          <p className="text-xs text-muted-foreground">
            {helperText || "PNG, JPG, WEBP or SVG, up to 5MB"}
          </p>
        </div>
        <div className="flex gap-2">
          {preview && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={isUploading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

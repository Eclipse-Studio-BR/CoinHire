import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  type: 'resume' | 'logo';
  onUploadComplete: (url: string) => void;
  currentFile?: string;
  accept?: string;
  label?: string;
  className?: string;
}

export function FileUpload({
  type,
  onUploadComplete,
  currentFile,
  accept = type === 'resume' ? '.pdf,.doc,.docx' : 'image/*',
  label,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | undefined>(currentFile);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append(type, file);

    try {
      const response = await apiRequest("POST", `/api/upload/${type}`, formData);
      const data = await response.json();
      
      setUploadedFile(data.url);
      onUploadComplete(data.url);
      
      toast({
        title: "Upload Successful",
        description: `Your ${type} has been uploaded.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(undefined);
    onUploadComplete("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      
      {uploadedFile ? (
        <div className="flex items-center gap-3 p-4 border rounded-md bg-card">
          {type === 'resume' ? (
            <FileText className="w-8 h-8 text-primary" />
          ) : (
            <img 
              src={uploadedFile} 
              alt="Uploaded file" 
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {type === 'resume' ? 'Resume uploaded' : 'Logo uploaded'}
            </p>
            <p className="text-xs text-muted-foreground">{uploadedFile}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleRemove}
            data-testid="button-remove-file"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary transition-colors">
          <Input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${type}`}
            data-testid={`input-file-${type}`}
            disabled={uploading}
          />
          <label htmlFor={`file-upload-${type}`} className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {uploading ? 'Uploading...' : `Click to upload ${type}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {type === 'resume' 
                    ? 'PDF or DOC (max 5MB)' 
                    : 'PNG, JPG, WEBP, or SVG (max 5MB)'}
                </p>
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}

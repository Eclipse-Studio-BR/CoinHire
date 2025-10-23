import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "./ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface FileUploadProps {
  type: 'resume' | 'logo';
  onUploadComplete: (url: string) => void;
  currentFile?: string;
  label?: string;
  className?: string;
}

export function FileUpload({
  type,
  onUploadComplete,
  currentFile,
  label,
  className,
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<string | undefined>(currentFile);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      setUploading(true);
      
      if (!result.successful || result.successful.length === 0) {
        throw new Error("Upload failed");
      }

      const uploadedUrl = result.successful[0].uploadURL;
      
      // Set ACL policy and get normalized path
      const aclEndpoint = type === 'resume' ? '/api/objects/resume' : '/api/objects/logo';
      const aclKey = type === 'resume' ? 'resumeURL' : 'logoURL';
      
      const response = await apiRequest("PUT", aclEndpoint, {
        [aclKey]: uploadedUrl,
      });
      const data = await response.json();
      
      setUploadedFile(data.objectPath);
      onUploadComplete(data.objectPath);
      
      toast({
        title: "Upload Successful",
        description: `Your ${type} has been uploaded.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(undefined);
    onUploadComplete("");
  };

  // File type restrictions
  const allowedFileTypes = type === 'resume' 
    ? ['.pdf', '.doc', '.docx'] 
    : ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

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
            <p className="text-xs text-muted-foreground truncate max-w-xs">{uploadedFile}</p>
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
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={5242880} // 5MB
            allowedFileTypes={allowedFileTypes}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleComplete}
            buttonVariant="ghost"
            buttonClassName="w-full h-auto p-0 hover:bg-transparent"
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <FileText className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {uploading ? 'Processing...' : `Click to upload ${type}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {type === 'resume' 
                    ? 'PDF or DOC (max 5MB)' 
                    : 'PNG, JPG, WEBP, or SVG (max 5MB)'}
                </p>
              </div>
            </div>
          </ObjectUploader>
        </div>
      )}
    </div>
  );
}

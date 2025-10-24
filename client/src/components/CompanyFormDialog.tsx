import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileUpload } from "@/components/FileUpload";
import type { Company } from "@shared/schema";

type CompanyFormData = {
  name: string;
  description: string;
  website: string;
  location: string;
  size: string;
  logo: string;
};

const DEFAULT_DATA: CompanyFormData = {
  name: "",
  description: "",
  website: "",
  location: "",
  size: "",
  logo: "",
};

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (company: Company) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Create Company",
  description = "Add your company information. It will be reviewed before appearing on the platform.",
  submitLabel = "Create Company",
}: CompanyFormDialogProps) {
  const [formData, setFormData] = useState<CompanyFormData>({ ...DEFAULT_DATA });
  const nameRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 10);
    } else {
      setFormData({ ...DEFAULT_DATA });
    }
  }, [open]);

  const createCompanyMutation = useMutation({
    mutationFn: async (payload: CompanyFormData) => {
      const response = await apiRequest("POST", "/api/companies", payload);
      return response.json() as Promise<Company>;
    },
    onSuccess: async (company) => {
      toast({
        title: "Company Created",
        description: "Your company is live and ready for job postings.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/employer/companies"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] }),
      ]);
      onSuccess?.(company);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCompanyMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Acme Corp"
              required
              ref={nameRef}
              data-testid="input-company-name"
            />
          </div>

          <div>
            <Label htmlFor="companyDescription">Description *</Label>
            <Textarea
              id="companyDescription"
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Tell us about your company..."
              className="min-h-[120px]"
              required
              data-testid="textarea-company-description"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="companyWebsite">Website</Label>
              <Input
                id="companyWebsite"
                type="url"
                value={formData.website}
                onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="https://example.com"
                data-testid="input-company-website"
              />
            </div>

            <div>
              <Label htmlFor="companyLocation">Location</Label>
              <Input
                id="companyLocation"
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="e.g. San Francisco, CA"
                data-testid="input-company-location"
              />
            </div>
          </div>

          <FileUpload
            type="logo"
            onUploadComplete={(url) => setFormData((prev) => ({ ...prev, logo: url }))}
            label="Company Logo (Optional)"
            currentFile={formData.logo}
          />

          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-company"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCompanyMutation.isPending}
              className="flex-1"
              data-testid="button-submit-company"
            >
              {createCompanyMutation.isPending ? "Creating..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

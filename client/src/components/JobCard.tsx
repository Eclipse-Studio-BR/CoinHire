import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Building2, Clock, Eye, Users, Bookmark, Star } from "lucide-react";
import type { Job, Company } from "@shared/schema";
import { formatTimeAgo, formatSalary } from "@/lib/utils";
import { JOB_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job & { company?: Company };
  onSave?: () => void;
  isSaved?: boolean;
}

export function JobCard({ job, onSave, isSaved }: JobCardProps) {
  const isPremium = job.tier === 'premium';
  const isFeatured = job.tier === 'featured';
  const companyLogo: string | undefined = job.company?.logo ?? undefined;
  const companyName: string | undefined = job.company?.name ?? undefined;

  return (
    <Card
      className={cn(
        "p-6 hover-elevate transition-all duration-200 relative overflow-visible",
        isPremium && "border-l-4 border-l-chart-3",
        isFeatured && "bg-accent/30"
      )}
      data-testid={`card-job-${job.id}`}
    >
      {isFeatured && (
        <div className="absolute top-4 right-4">
          <Star className="w-5 h-5 fill-chart-4 text-chart-4" data-testid="icon-featured" />
        </div>
      )}

      <div className="flex gap-4">
        <Link href={`/companies/${job.company?.slug || job.companyId}`}>
          <Avatar className="h-12 w-12" data-testid="avatar-company">
            <AvatarImage
              src={companyLogo}
              alt={companyName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {companyName?.slice(0, 2)?.toUpperCase() || 'CO'}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <Link href={`/jobs/${job.id}`}>
                <h3 className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-1" data-testid="text-job-title">
                  {job.title}
                </h3>
              </Link>
              <Link href={`/companies/${job.company?.slug || job.companyId}`}>
                <p className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" data-testid="text-company-name">
                  <Building2 className="w-4 h-4" />
                  {companyName || 'Company'}
                </p>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="text-xs" data-testid="badge-job-type">
              {JOB_TYPES[job.jobType]}
            </Badge>
            <Badge variant="secondary" className="text-xs" data-testid="badge-experience-level">
              {EXPERIENCE_LEVELS[job.experienceLevel]}
            </Badge>
            {job.salaryMin || job.salaryMax ? (
              <Badge variant="outline" className="text-xs" data-testid="badge-salary">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency ?? undefined, job.salaryPeriod)}
              </Badge>
            ) : null}
            {job.category && (
              <Badge variant="outline" className="text-xs" data-testid="badge-category">
                {job.category}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1" data-testid="text-location">
              <MapPin className="w-4 h-4" />
              <span>{job.isRemote ? 'Remote' : job.location || 'Location not specified'}</span>
            </div>
            <div className="flex items-center gap-1" data-testid="text-posted-time">
              <Clock className="w-4 h-4" />
              <span>{formatTimeAgo(job.publishedAt || job.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" data-testid="text-view-count">
                <Eye className="w-4 h-4" />
                <span>{job.viewCount} views</span>
              </div>
              <div className="flex items-center gap-1" data-testid="text-apply-count">
                <Users className="w-4 h-4" />
                <span>{job.applyCount} applicants</span>
              </div>
            </div>

            {onSave && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSave}
                data-testid="button-save-job"
                className="gap-2"
              >
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

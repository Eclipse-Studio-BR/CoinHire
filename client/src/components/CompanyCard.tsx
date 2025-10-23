import { Link } from "wouter";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase } from "lucide-react";
import type { Company } from "@shared/schema";
import { truncate } from "@/lib/utils";

interface CompanyCardProps {
  company: Company;
  jobCount?: number;
}

export function CompanyCard({ company, jobCount = 0 }: CompanyCardProps) {
  return (
    <Card className="hover-elevate transition-all duration-200" data-testid={`card-company-${company.id}`}>
      <CardHeader className="flex flex-row items-center gap-4 pb-3">
        <Avatar className="h-16 w-16" data-testid="avatar-company-logo">
          <AvatarImage src={company.logo || undefined} alt={company.name} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
            {company.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate" data-testid="text-company-name">
            {company.name}
          </h3>
          {company.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-company-location">
              <MapPin className="w-3 h-3" />
              {company.location}
            </p>
          )}
        </div>
        {company.isHiring && (
          <Badge variant="default" className="text-xs" data-testid="badge-hiring">
            Hiring
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground line-clamp-3" data-testid="text-company-description">
          {company.description ? truncate(company.description, 150) : 'No description available'}
        </p>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-job-count">
          <Briefcase className="w-4 h-4" />
          <span>{jobCount} open {jobCount === 1 ? 'position' : 'positions'}</span>
        </div>
        <Link href={`/companies/${company.slug}`}>
          <Button variant="outline" size="sm" data-testid="button-view-company">
            View Company
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

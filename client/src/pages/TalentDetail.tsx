import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Briefcase, 
  Calendar,
  DollarSign,
  ArrowLeft,
  Loader2,
  Linkedin,
  Send,
  Mail
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { getToolIcon, getLanguageFlag } from "@/lib/iconHelpers";
import { Link } from "wouter";
import type { TalentProfile, User } from "@shared/schema";

type TalentWithUser = TalentProfile & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'profileImageUrl'>;
};

export default function TalentDetail() {
  const params = useParams();
  const talentId = params.id;

  const { data: talent, isLoading } = useQuery<TalentWithUser>({
    queryKey: [`/api/talents/${talentId}`],
    enabled: !!talentId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground mb-4">
                Talent profile not found or not public.
              </p>
              <Button asChild className="w-full">
                <Link href="/talents">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Talents
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const fullName = `${talent.user.firstName || ''} ${talent.user.lastName || ''}`.trim() || 'Talent';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/talents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Talents
            </Link>
          </Button>

          {/* Header Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32 flex-shrink-0">
                  <AvatarImage
                    src={talent.user.profileImageUrl || undefined}
                    alt={fullName}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl">
                    {getInitials(talent.user.firstName, talent.user.lastName, talent.user.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{fullName}</h1>
                      {talent.headline && (
                        <p className="text-xl text-primary font-medium mb-3">{talent.headline}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {talent.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {talent.location}
                          </div>
                        )}
                        {talent.timezone && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {talent.timezone}
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge 
                      className={
                        talent.jobAvailability === 'actively_looking' 
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : talent.jobAvailability === 'open_to_offers'
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }
                    >
                      {talent.jobAvailability === 'actively_looking' 
                        ? "Actively Looking"
                        : talent.jobAvailability === 'open_to_offers'
                        ? "Open To Offers"
                        : "Not Available"}
                    </Badge>
                  </div>

                  {/* Quick Info */}
                  <div className="flex flex-wrap gap-6">
                    {talent.preferredJobTypes && talent.preferredJobTypes.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{talent.preferredJobTypes.join(', ').replace(/_/g, '-')}</span>
                      </div>
                    )}
                    {talent.workFlexibility && talent.workFlexibility.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{talent.workFlexibility.join(', ')}</span>
                      </div>
                    )}
                    {(talent.hourlyRate || talent.monthlyRate) && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {talent.hourlyRate && <span>${talent.hourlyRate}/hr</span>}
                        {talent.hourlyRate && talent.monthlyRate && <span className="text-muted-foreground">•</span>}
                        {talent.monthlyRate && <span>${talent.monthlyRate.toLocaleString()}/mo</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bio/Summary */}
              {talent.bio && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Summary</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {talent.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {talent.skills && talent.skills.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {talent.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tools */}
              {talent.tools && talent.tools.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Tools & Technologies</h2>
                    <div className="flex flex-wrap gap-2">
                      {talent.tools.map((tool, idx) => (
                        <Badge key={idx} variant="outline" className="flex items-center gap-2 text-sm">
                          <img 
                            src={getToolIcon(tool)} 
                            alt={tool}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span>{tool}</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {talent.languages && talent.languages.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Languages</h2>
                    <div className="flex flex-wrap gap-2">
                      {talent.languages.map((language, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-2 text-sm">
                          <span className="text-base">{getLanguageFlag(language)}</span>
                          <span>{language}</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Contact Links */}
              {(talent.linkedinUrl || talent.telegram || talent.user.email) && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-4">Contact</h2>
                    <div className="flex gap-3">
                      {talent.linkedinUrl && (
                        <a
                          href={talent.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0077B5] text-white hover:opacity-90 transition-opacity"
                          title="LinkedIn Profile"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {talent.telegram && (
                        <a
                          href={talent.telegram.startsWith('@') ? `https://t.me/${talent.telegram.substring(1)}` : talent.telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0088cc] text-white hover:opacity-90 transition-opacity"
                          title={`Telegram: ${talent.telegram}`}
                        >
                          <Send className="h-5 w-5" />
                        </a>
                      )}
                      {talent.user.email && (
                        <a
                          href={`mailto:${talent.user.email}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
                          title={`Email: ${talent.user.email}`}
                        >
                          <Mail className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                  <div className="space-y-3 text-sm">
                    {talent.preferredJobTypes && talent.preferredJobTypes.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Job Type:</span>
                        <p className="font-medium capitalize">
                          {talent.preferredJobTypes.join(', ').replace(/_/g, '-')}
                        </p>
                      </div>
                    )}
                    {talent.workFlexibility && talent.workFlexibility.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Work Style:</span>
                        <p className="font-medium capitalize">
                          {talent.workFlexibility.join(', ')}
                        </p>
                      </div>
                    )}
                    {(talent.hourlyRate || talent.monthlyRate) && (
                      <>
                        {talent.hourlyRate && (
                          <div>
                            <span className="text-muted-foreground">Hourly Rate:</span>
                            <p className="font-medium">${talent.hourlyRate}/hour USD</p>
                          </div>
                        )}
                        {talent.monthlyRate && (
                          <div>
                            <span className="text-muted-foreground">Monthly Rate:</span>
                            <p className="font-medium">${talent.monthlyRate.toLocaleString()}/month USD</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Briefcase, MapPin, DollarSign, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Application, Job, Company, Message, TalentProfile } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ApplicationWithJob = Application & { 
  job?: Job & { company?: Company };
  unreadCount?: number;
  lastMessage?: Message;
  applicant?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  applicantProfile?: TalentProfile | null;
};

type EmployerApplicationsResponse = {
  job: Job & { company?: Company };
  applications: ApplicationWithJob[];
};

export default function Messages() {
  const { user } = useAuth();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isTalent = user?.role === "talent";
  const isEmployer = user?.role === "employer" || user?.role === "recruiter";

  // Fetch applications based on role
  const { data: talentApplications = [] } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/applications"],
    enabled: !!user && isTalent,
  });

  const { data: employerData = [] } = useQuery<EmployerApplicationsResponse[]>({
    queryKey: ["/api/employer/applications"],
    enabled: !!user && isEmployer,
  });

  // Flatten employer applications
  const employerApplications = employerData.flatMap(item => 
    item.applications.map(app => ({
      ...app,
      job: item.job
    }))
  );

  const applications = isTalent ? talentApplications : employerApplications;

  // Fetch all messages to calculate unread counts
  const { data: allMessagesData = [] } = useQuery<Array<{ applicationId: string; messages: Message[] }>>({
    queryKey: ["/api/all-application-messages"],
    queryFn: async () => {
      if (!user) return [];
      const interviewApps = applications.filter(app => app.status === 'interview');
      const results = await Promise.all(
        interviewApps.map(async (app) => {
          try {
            const response = await fetch(`/api/applications/${app.id}/messages`, {
              credentials: 'include'
            });
            if (!response.ok) return { applicationId: app.id, messages: [] };
            const messages = await response.json();
            return { applicationId: app.id, messages };
          } catch {
            return { applicationId: app.id, messages: [] };
          }
        })
      );
      return results;
    },
    enabled: !!user && applications.length > 0,
    refetchInterval: 5000,
  });

  // Calculate unread counts for each application
  const applicationsWithUnread = applications.map(app => {
    const appMessages = allMessagesData.find(d => d.applicationId === app.id)?.messages || [];
    const unreadCount = appMessages.filter(msg => 
      msg.senderId !== user?.id && !msg.isRead
    ).length;
    return {
      ...app,
      unreadCount,
      lastMessage: appMessages[appMessages.length - 1]
    };
  });

  // Fetch messages for selected application
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/applications/messages", selectedApplicationId],
    queryFn: async () => {
      if (!selectedApplicationId) return [];
      const response = await fetch(`/api/applications/${selectedApplicationId}/messages`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedApplicationId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ applicationId, message }: { applicationId: string; message: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/messages`, { message });
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/applications/messages", selectedApplicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-messages"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("PUT", `/api/applications/${applicationId}/messages/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/applications"] });
    },
  });

  const closeChatMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/applications/${applicationId}/close-chat`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/messages", selectedApplicationId] });
      setSelectedApplicationId(null);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("DELETE", `/api/applications/${applicationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-messages"] });
      setSelectedApplicationId(null);
    },
  });

  // Filter applications with interview status (have messages)
  // Employers only see active interviews, talents see all
  const conversationApps = applicationsWithUnread
    .filter(app => isEmployer ? app.status === 'interview' : (app.status === 'interview' || app.status === 'rejected'))
    .filter(app => 
      !searchQuery || 
      app.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job?.company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const selectedApp = applicationsWithUnread.find(app => app.id === selectedApplicationId);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Messages</h1>
          
          <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 280px)' }}>
            {/* Left Sidebar - Conversations List */}
            <Card className="col-span-4 p-4 flex flex-col">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {conversationApps.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No conversations yet
                    </p>
                  ) : (
                    conversationApps.map((app) => {
                      const displayName = isEmployer
                        ? `${app.applicant?.firstName || ''} ${app.applicant?.lastName || ''}`.trim() || app.applicant?.email || 'Applicant'
                        : app.job?.company?.name || 'Company';
                      const displayAvatar = isEmployer
                        ? (app.applicantProfile as any)?.profileImageUrl || app.applicant?.profileImageUrl
                        : app.job?.company?.logo;
                      const displayInitials = isEmployer
                        ? (app.applicant?.firstName?.[0] || app.applicant?.email?.[0] || 'A')
                        : (app.job?.company?.name?.[0] || 'C');
                      
                      return (
                        <button
                          key={app.id}
                          onClick={() => {
                            setSelectedApplicationId(app.id);
                            // Mark messages as read when conversation is opened
                            if (app.unreadCount && app.unreadCount > 0) {
                              markAsReadMutation.mutate(app.id);
                            }
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedApplicationId === app.id
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={displayAvatar || undefined} />
                              <AvatarFallback>{displayInitials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className={`font-semibold text-sm truncate ${
                                  app.unreadCount && app.unreadCount > 0 ? 'text-primary' : ''
                                }`}>
                                  {displayName}
                                </h3>
                                <div className="flex items-center gap-2">
                                  {app.unreadCount > 0 ? (
                                    <>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(app.createdAt).toLocaleDateString()}
                                      </span>
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                        {app.unreadCount}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(app.createdAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {app.job?.title}
                              </p>
                              <Badge variant={app.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                                {app.status === 'rejected' ? 'Closed' : 'Interview'}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Center - Chat Area */}
            <Card className="col-span-5 flex flex-col h-full overflow-hidden">
              {selectedApp ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={
                          isEmployer 
                            ? ((selectedApp.applicantProfile as any)?.profileImageUrl || selectedApp.applicant?.profileImageUrl || undefined)
                            : (selectedApp.job?.company?.logo || undefined)
                        } />
                        <AvatarFallback>
                          {isEmployer 
                            ? (selectedApp.applicant?.firstName?.[0] || selectedApp.applicant?.email?.[0] || 'A')
                            : (selectedApp.job?.company?.name?.[0] || 'C')
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="font-semibold">
                          {isEmployer 
                            ? `${selectedApp.applicant?.firstName || ''} ${selectedApp.applicant?.lastName || ''}`.trim() || selectedApp.applicant?.email || 'Applicant'
                            : selectedApp.job?.company?.name
                          }
                        </h2>
                        <p className="text-sm text-muted-foreground">{selectedApp.job?.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4" style={{ maxHeight: 'calc(100% - 180px)' }}>
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No messages yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const isMe = msg.senderId === user?.id;
                          const otherAvatar = isEmployer
                            ? ((selectedApp.applicantProfile as any)?.profileImageUrl || selectedApp.applicant?.profileImageUrl)
                            : selectedApp.job?.company?.logo;
                          const otherInitials = isEmployer
                            ? (selectedApp.applicant?.firstName?.[0] || selectedApp.applicant?.email?.[0] || 'A')
                            : (selectedApp.job?.company?.name?.[0] || 'C');
                          
                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage 
                                  src={isMe ? (user?.profileImageUrl || undefined) : (otherAvatar || undefined)} 
                                />
                                <AvatarFallback>
                                  {isMe ? (user?.firstName?.[0] || 'Y') : otherInitials}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`flex-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`rounded-lg p-3 max-w-[80%] ${
                                  isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  {selectedApp.status !== 'rejected' ? (
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your message..."
                          rows={2}
                          className="flex-1 resize-none"
                        />
                        <Button
                          onClick={() => sendMessageMutation.mutate({ 
                            applicationId: selectedApp.id, 
                            message: replyText 
                          })}
                          disabled={!replyText.trim() || sendMessageMutation.isPending}
                          size="icon"
                          className="h-auto"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t bg-muted">
                      <p className="text-sm text-center text-muted-foreground">
                        This chat has been closed. No further messages can be sent.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Select a conversation to view messages</p>
                </div>
              )}
            </Card>

            {/* Right Sidebar - Job Details or Applicant Profile */}
            <Card className="col-span-3 p-4">
              {selectedApp ? (
                <div className="space-y-4">
                  {isEmployer && selectedApp.applicant ? (
                    /* Employer View - Applicant Profile */
                    <>
                      <h3 className="font-semibold text-lg">Applicant Profile</h3>
                      
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={(selectedApp.applicantProfile as any)?.profileImageUrl || selectedApp.applicant?.profileImageUrl || undefined} />
                          <AvatarFallback>{selectedApp.applicant?.firstName?.[0] || 'A'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {`${selectedApp.applicant.firstName || ''} ${selectedApp.applicant.lastName || ''}`.trim() || 'Applicant'}
                          </h4>
                          <p className="text-sm text-muted-foreground">{selectedApp.applicant.email}</p>
                        </div>
                      </div>

                      {selectedApp.applicantProfile && (
                        <>
                          {selectedApp.applicantProfile.headline && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Title</p>
                              <p className="text-sm">{selectedApp.applicantProfile.headline}</p>
                            </div>
                          )}

                          {(selectedApp.applicantProfile.location || selectedApp.applicantProfile.timezone) && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Location</p>
                              <p className="text-sm">
                                {[selectedApp.applicantProfile.location, selectedApp.applicantProfile.timezone].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          )}

                          {selectedApp.applicantProfile.skills && selectedApp.applicantProfile.skills.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Skills</p>
                              <p className="text-sm">{selectedApp.applicantProfile.skills.join(', ')}</p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="pt-4 border-t">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Applied For</p>
                        <p className="font-medium text-sm">{selectedApp.job?.title}</p>
                      </div>

                      {selectedApp.resumeUrl && (
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => window.open(selectedApp.resumeUrl!, '_blank')}
                        >
                          View Resume
                        </Button>
                      )}

                      {selectedApp.status !== 'rejected' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              className="w-full" 
                              variant="destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Close Chat
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Close Chat & Reject Application?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action will:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Mark this application as rejected</li>
                                  <li>Send an automated rejection message to the applicant</li>
                                  <li>Remove the applicant from your applications list</li>
                                  <li>Prevent further messages from the applicant</li>
                                </ul>
                                <p className="mt-2 font-semibold">This action cannot be undone.</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => closeChatMutation.mutate(selectedApp.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Close Chat & Reject
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  ) : selectedApp.job ? (
                    /* Talent View - Job Details */
                    <>
                      <h3 className="font-semibold text-lg">Job Details</h3>
                      
                      <div>
                        <h4 className="font-medium mb-2">{selectedApp.job.title}</h4>
                        <p className="text-sm text-muted-foreground">{selectedApp.job.company?.name}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedApp.job.location || 'Remote'}</span>
                        </div>
                        
                        {(selectedApp.job.salaryMin || selectedApp.job.salaryMax) && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {selectedApp.job.salaryMin && selectedApp.job.salaryMax
                                ? `$${selectedApp.job.salaryMin.toLocaleString()} - $${selectedApp.job.salaryMax.toLocaleString()}`
                                : selectedApp.job.salaryMin
                                ? `From $${selectedApp.job.salaryMin.toLocaleString()}`
                                : `Up to $${selectedApp.job.salaryMax?.toLocaleString()}`}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{selectedApp.job.jobType}</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => window.location.href = `/jobs/${selectedApp.job?.id}`}
                      >
                        View Full Job Posting
                      </Button>

                      {selectedApp.status === 'rejected' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              className="w-full" 
                              variant="destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Delete Chat
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this conversation and remove it from your messages.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteChatMutation.mutate(selectedApp.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Chat
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Select a conversation to view {isEmployer ? 'applicant profile' : 'job details'}
                </p>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

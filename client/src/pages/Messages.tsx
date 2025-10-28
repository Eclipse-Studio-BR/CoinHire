import { useState, useEffect } from "react";
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
import { Search, Send, ArrowLeft, MoreVertical, Phone, Video, Paperclip, Smile } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    const lastMessage = appMessages[appMessages.length - 1];
    return {
      ...app,
      unreadCount,
      lastMessage
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
      setShowCloseDialog(false);
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
      setShowDeleteDialog(false);
    },
  });

  // Filter applications with interview status (have messages)
  const conversationApps = applicationsWithUnread
    .filter(app => isEmployer ? app.status === 'interview' : (app.status === 'interview' || app.status === 'rejected'))
    .filter(app => 
      !searchQuery || 
      app.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job?.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isEmployer && (
        app.applicant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicant?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    )
    .sort((a, b) => {
      // Sort by last message time, most recent first
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  const selectedApp = applicationsWithUnread.find(app => app.id === selectedApplicationId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (selectedApplicationId) {
      const scrollArea = document.getElementById('messages-scroll-area');
      if (scrollArea) {
        setTimeout(() => {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }, 100);
      }
    }
  }, [messages, selectedApplicationId]);

  // Auto-refresh messages and applications every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/applications"] });
      if (selectedApplicationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/applications/messages", selectedApplicationId] });
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [selectedApplicationId]);

  const formatMessageTime = (date: Date | string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const formatChatTime = (date: Date | string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date: Date | string | undefined) => {
    if (!date) return 'Offline';
    
    const lastSeenDate = new Date(date);
    if (isNaN(lastSeenDate.getTime())) return 'Offline';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays === 1) return 'Last seen yesterday';
    if (diffDays < 7) return `Last seen ${diffDays}d ago`;
    return `Last seen ${lastSeenDate.toLocaleDateString()}`;
  };

  const isUserOnline = (lastActiveAt: Date | string | undefined) => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins < 5; // Consider online if active within last 5 minutes
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 bg-muted/20">
        {/* Desktop Layout */}
        <div className="hidden lg:block">
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
                        {searchQuery ? 'No conversations found' : 'No conversations yet'}
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
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={displayAvatar || undefined} />
                                <AvatarFallback>{displayInitials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold truncate ${
                                      app.unreadCount && app.unreadCount > 0 ? 'text-primary' : ''
                                    }`}>
                                      {displayName}
                                    </h3>
                                    {isEmployer ? (
                                      app.applicantProfile?.headline && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {app.applicantProfile.headline}
                                        </p>
                                      )
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Company</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                    {formatMessageTime(app.lastMessage?.createdAt || app.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-muted-foreground truncate flex-1">
                                    {app.lastMessage?.message || app.job?.title || 'No messages yet'}
                                  </p>
                                  {app.unreadCount > 0 && (
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold ml-2">
                                      {app.unreadCount}
                                    </div>
                                  )}
                                </div>
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
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
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
                        <div className="flex-1 min-w-0">
                          <div>
                            <h2 className="font-semibold truncate">
                              {isEmployer 
                                ? `${selectedApp.applicant?.firstName || ''} ${selectedApp.applicant?.lastName || ''}`.trim() || selectedApp.applicant?.email || 'Applicant'
                                : selectedApp.job?.company?.name
                              }
                            </h2>
                            <p className="text-xs text-muted-foreground truncate">
                              {selectedApp.status === 'rejected' 
                                ? 'Chat Closed' 
                                : isEmployer 
                                  ? formatLastSeen((selectedApp.applicantProfile as any)?.lastActiveAt)
                                  : 'Company'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" id="messages-scroll-area">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-center text-muted-foreground">
                            No messages yet. Start the conversation!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 pb-4">
                          {messages.map((msg, index) => {
                            const isMe = msg.senderId === user?.id;
                            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
                            
                            return (
                              <div
                                key={msg.id}
                                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                              >
                                {showAvatar ? (
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage 
                                      src={isMe 
                                        ? (user?.profileImageUrl || undefined) 
                                        : (isEmployer 
                                          ? ((selectedApp.applicantProfile as any)?.profileImageUrl || selectedApp.applicant?.profileImageUrl || undefined)
                                          : (selectedApp.job?.company?.logo || undefined)
                                        )
                                      } 
                                    />
                                    <AvatarFallback>
                                      {isMe 
                                        ? (user?.firstName?.[0] || 'Y') 
                                        : (isEmployer 
                                          ? (selectedApp.applicant?.firstName?.[0] || 'A')
                                          : (selectedApp.job?.company?.name?.[0] || 'C')
                                        )
                                      }
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="w-8 flex-shrink-0" />
                                )}
                                <div className={`flex-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col max-w-[70%]`}>
                                  <div className={`rounded-2xl px-4 py-2 ${
                                    isMe 
                                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                      : 'bg-muted rounded-tl-sm'
                                  }`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1 px-1">
                                    {formatChatTime(msg.createdAt)}
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (replyText.trim()) {
                                  sendMessageMutation.mutate({ 
                                    applicationId: selectedApp.id, 
                                    message: replyText 
                                  });
                                }
                              }
                            }}
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
                      <div className="p-4 border-t bg-muted/50">
                        <p className="text-sm text-center text-muted-foreground">
                          This chat has been closed. No further messages can be sent.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-2">Select a conversation to view messages</p>
                      <p className="text-sm text-muted-foreground">Your messages will appear here</p>
                    </div>
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
                            asChild
                          >
                            <a 
                              href={selectedApp.resumeUrl}
                              target="_blank" 
                              rel="noreferrer"
                            >
                              View Resume
                            </a>
                          </Button>
                        )}

                        {selectedApp.status !== 'rejected' && (
                          <Button 
                            className="w-full" 
                            variant="destructive"
                            onClick={() => setShowCloseDialog(true)}
                          >
                            Close Chat & Reject
                          </Button>
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
                          {selectedApp.job.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Location:</span>
                              <span>{selectedApp.job.location}</span>
                            </div>
                          )}
                          
                          {(selectedApp.job.salaryMin || selectedApp.job.salaryMax) && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Salary:</span>
                              <span>
                                {selectedApp.job.salaryMin && selectedApp.job.salaryMax
                                  ? `$${selectedApp.job.salaryMin.toLocaleString()} - $${selectedApp.job.salaryMax.toLocaleString()}`
                                  : selectedApp.job.salaryMin
                                  ? `From $${selectedApp.job.salaryMin.toLocaleString()}`
                                  : `Up to $${selectedApp.job.salaryMax?.toLocaleString()}`}
                              </span>
                            </div>
                          )}
                          
                          {selectedApp.job.jobType && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="capitalize">{selectedApp.job.jobType}</span>
                            </div>
                          )}
                        </div>

                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => window.location.href = `/jobs/${selectedApp.job?.id}`}
                        >
                          View Full Job Posting
                        </Button>

                        {selectedApp.status === 'rejected' && (
                          <Button 
                            className="w-full" 
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            Delete Chat
                          </Button>
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
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden h-[calc(100vh-64px)]">
          {!selectedApplicationId ? (
            /* Message List View */
            <div className="flex flex-col h-full bg-background">
              {/* Search Header */}
              <div className="p-4 border-b bg-background sticky top-0 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="Search message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base rounded-xl"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="flex-1">
                {conversationApps.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-2">
                        {searchQuery ? 'No conversations found' : 'No messages yet'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'Try adjusting your search' : 'Your conversations will appear here'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversationApps.map((app) => {
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
                            if (app.unreadCount && app.unreadCount > 0) {
                              markAsReadMutation.mutate(app.id);
                            }
                          }}
                          className="w-full text-left p-4 hover:bg-muted/50 active:bg-muted transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-14 w-14">
                                <AvatarImage src={displayAvatar || undefined} />
                                <AvatarFallback className="text-lg">{displayInitials}</AvatarFallback>
                              </Avatar>
                              {isUserOnline(isEmployer ? (app.applicantProfile as any)?.lastActiveAt : undefined) && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base truncate">
                                    {displayName}
                                  </h3>
                                  {isEmployer ? (
                                    app.applicantProfile?.headline && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {app.applicantProfile.headline}
                                      </p>
                                    )
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Company</p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {formatMessageTime(app.lastMessage?.createdAt || app.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-muted-foreground truncate flex-1">
                                  {app.lastMessage?.senderId === user?.id && (
                                    <span className="mr-1">✓</span>
                                  )}
                                  {app.lastMessage?.message || app.job?.title || 'No messages yet'}
                                </p>
                                {app.unreadCount > 0 && (
                                  <div className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                                    {app.unreadCount}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            /* Chat Detail View */
            <div className="flex flex-col h-full bg-background">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b bg-background sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedApplicationId(null)}
                    className="flex-shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={
                        isEmployer 
                          ? ((selectedApp?.applicantProfile as any)?.profileImageUrl || selectedApp?.applicant?.profileImageUrl || undefined)
                          : (selectedApp?.job?.company?.logo || undefined)
                      } />
                      <AvatarFallback>
                        {isEmployer 
                          ? (selectedApp?.applicant?.firstName?.[0] || selectedApp?.applicant?.email?.[0] || 'A')
                          : (selectedApp?.job?.company?.name?.[0] || 'C')
                        }
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(isEmployer 
                      ? (selectedApp?.applicantProfile as any)?.lastActiveAt 
                      : undefined
                    ) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base truncate">
                      {isEmployer 
                        ? `${selectedApp?.applicant?.firstName || ''} ${selectedApp?.applicant?.lastName || ''}`.trim() || selectedApp?.applicant?.email || 'Applicant'
                        : selectedApp?.job?.company?.name
                      }
                    </h2>
                            <p className="text-xs text-muted-foreground truncate">
                              {selectedApp?.status === 'rejected' 
                                ? 'Chat Closed' 
                                : isEmployer 
                                  ? formatLastSeen((selectedApp?.applicantProfile as any)?.lastActiveAt)
                                  : 'Company'
                              }
                            </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {selectedApp && (
                        <div className="p-3 space-y-3">
                          {isEmployer && selectedApp.applicant ? (
                            /* Employer View - Applicant Info */
                            <>
                              {selectedApp.applicantProfile?.headline && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Title</p>
                                  <p className="text-sm">{selectedApp.applicantProfile.headline}</p>
                                </div>
                              )}

                              {(selectedApp.applicantProfile?.location || selectedApp.applicantProfile?.timezone) && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                                  <p className="text-sm">
                                    {[selectedApp.applicantProfile.location, selectedApp.applicantProfile.timezone].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-col gap-2 pt-2">
                                {selectedApp.resumeUrl && (
                                  <Button 
                                    className="w-full" 
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a 
                                      href={selectedApp.resumeUrl}
                                      target="_blank" 
                                      rel="noreferrer"
                                    >
                                      View Resume
                                    </a>
                                  </Button>
                                )}
                                <Button 
                                  className="w-full" 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = `/jobs/${selectedApp.job?.id}`}
                                >
                                  View Job Details
                                </Button>
                                {selectedApp.status !== 'rejected' && (
                                  <Button 
                                    className="w-full" 
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowCloseDialog(true)}
                                  >
                                    Close Chat & Reject
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : selectedApp.job ? (
                            /* Talent View - Job Details */
                            <>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Position</p>
                                <p className="text-sm font-medium">{selectedApp.job.title}</p>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Company</p>
                                <p className="text-sm">{selectedApp.job.company?.name}</p>
                              </div>

                              {selectedApp.job.location && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                                  <p className="text-sm">{selectedApp.job.location}</p>
                                </div>
                              )}

                              <div className="flex flex-col gap-2 pt-2">
                                <Button 
                                  className="w-full" 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = `/jobs/${selectedApp.job?.id}`}
                                >
                                  View Full Job Posting
                                </Button>

                                {selectedApp.status === 'rejected' && (
                                  <Button 
                                    className="w-full" 
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowDeleteDialog(true)}
                                  >
                                    Delete Chat
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-center text-muted-foreground">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((msg, index) => {
                      const isMe = msg.senderId === user?.id;
                      const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {showAvatar ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage 
                                src={isMe 
                                  ? (user?.profileImageUrl || undefined) 
                                  : (isEmployer 
                                    ? ((selectedApp?.applicantProfile as any)?.profileImageUrl || selectedApp?.applicant?.profileImageUrl || undefined)
                                    : (selectedApp?.job?.company?.logo || undefined)
                                  )
                                } 
                              />
                              <AvatarFallback>
                                {isMe 
                                  ? (user?.firstName?.[0] || 'Y') 
                                  : (isEmployer 
                                    ? (selectedApp?.applicant?.firstName?.[0] || 'A')
                                    : (selectedApp?.job?.company?.name?.[0] || 'C')
                                  )
                                }
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 flex-shrink-0" />
                          )}
                          <div className={`flex-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col max-w-[75%]`}>
                            <div className={`rounded-3xl px-4 py-3 ${
                              isMe 
                                ? 'bg-primary text-primary-foreground rounded-tr-md' 
                                : 'bg-muted rounded-tl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 px-1">
                              {formatChatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message Input */}
              {selectedApp?.status !== 'rejected' ? (
                <div className="p-4 border-t bg-background">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-muted rounded-3xl px-4 py-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (replyText.trim() && selectedApp) {
                              sendMessageMutation.mutate({ 
                                applicationId: selectedApp.id, 
                                message: replyText 
                              });
                            }
                          }
                        }}
                        placeholder="Type here..."
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0 h-auto"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedApp) {
                          sendMessageMutation.mutate({ 
                            applicationId: selectedApp.id, 
                            message: replyText 
                          });
                        }
                      }}
                      disabled={!replyText.trim() || sendMessageMutation.isPending}
                      size="icon"
                      className="h-12 w-12 rounded-full flex-shrink-0"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t bg-muted/50">
                  <p className="text-sm text-center text-muted-foreground">
                    This chat has been closed. No further messages can be sent.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>

      {/* Alert Dialogs */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
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
              onClick={() => selectedApplicationId && closeChatMutation.mutate(selectedApplicationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close Chat & Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={() => selectedApplicationId && deleteChatMutation.mutate(selectedApplicationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

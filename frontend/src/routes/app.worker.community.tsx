import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagBadge } from "@/components/TagBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowBigUp,
  MessageSquare,
  Plus,
  Image as ImageIcon,
  X,
  Search,
  Filter,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Inbox,
  Share2,
  Check,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";

export const Route = createFileRoute("/app/worker/community")({
  head: () => ({ meta: [{ title: "Community Board — FairGig" }] }),
  component: Community,
});

const CATEGORIES = [
  "commission_change",
  "account_deactivation",
  "payment_delay",
  "unfair_rating",
  "safety_concern",
  "app_bug",
  "other",
];

const PLATFORMS = ["Uber", "Careem", "Foodpanda", "Bykea", "InDrive", "Other"];

const CITY_ZONES = [
  "Karachi - South",
  "Karachi - East",
  "Karachi - Central",
  "Lahore - Gulberg",
  "Lahore - DHA",
  "Islamabad - G Sectors",
  "Rawalpindi - Bahria",
];

function Community() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filters
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // New Complaint State
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [newArea, setNewArea] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterPlatform !== "all") params.platform = filterPlatform;
      if (filterArea !== "all") params.city_zone = filterArea;
      
      if (showOnlyMine) {
        const user = getUser();
        if (user) params.poster_id = user.id;
      }

      const data = await api.grievance.listComplaints(params);
      setComplaints(data.complaints);
    } catch (err) {
      console.error("Failed to fetch complaints", err);
      toast.error("Could not load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filterPlatform, filterArea, showOnlyMine]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setNewImages((prev) => [...prev, url]);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!newTitle || !newPlatform || !newBody) {
      toast.error("Please fill required fields");
      return;
    }

    setIsPosting(true);
    try {
      await api.grievance.createComplaint({
        title: newTitle,
        platform: newPlatform,
        category: newCategory,
        description: newBody,
        city_zone: newArea,
        images: newImages,
        anonymous: false,
      });
      toast.success("Complaint posted!");
      setIsDialogOpen(false);
      // Reset
      setNewTitle("");
      setNewPlatform("");
      setNewBody("");
      setNewImages([]);
      fetchComplaints();
    } catch (err) {
      toast.error("Failed to post grievance");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Community Grievance Board"
        description="Rally support and discuss unfair practices with fellow workers."
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-glow">
                <Plus className="h-4 w-4" /> New Complaint
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>File a community report</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Platform</label>
                    <Select onValueChange={setNewPlatform} value={newPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Category</label>
                    <Select onValueChange={setNewCategory} value={newCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Title</label>
                  <Input
                    placeholder="Short summary (e.g., Pay reduced by 20%)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">City Area (Optional)</label>
                  <Select onValueChange={setNewArea} value={newArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Area" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Details</label>
                  <Textarea
                    placeholder="Provide evidence and details..."
                    rows={4}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Attachments (Evidence)</label>
                  <div className="flex flex-wrap gap-2">
                    {newImages.map((img, i) => (
                      <div key={i} className="relative h-16 w-16 rounded border overflow-hidden">
                        <img src={img} className="h-full w-full object-cover" />
                        <button
                          onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 bg-black/40 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="h-16 w-16 rounded border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[9px] mt-1">Add Image</span>
                        </>
                      )}
                      <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={isPosting} onClick={handleCreateProposal}>
                  {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post Grievance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main Feed */}
        <div className="flex-1 space-y-4">
          {/* Filter Bar */}
          <div className="mb-6 flex flex-wrap gap-3 items-center rounded-xl border bg-card/50 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80 pr-2 border-r">
              <Filter className="h-4 w-4" /> Filters
            </div>
            
            <Select onValueChange={setFilterPlatform} value={filterPlatform}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select onValueChange={setFilterArea} value={filterArea}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {CITY_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto px-4 border-l">
              <label htmlFor="show-mine" className="text-xs font-medium cursor-pointer">My Reports</label>
              <input 
                id="show-mine"
                type="checkbox" 
                checked={showOnlyMine}
                onChange={(e) => setShowOnlyMine(e.target.checked)}
                className="h-4 w-4 rounded border-muted accent-primary cursor-pointer"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={() => { setFilterArea("all"); setFilterPlatform("all"); setShowOnlyMine(false); }} className="text-xs text-muted-foreground h-9 ml-2">
              Clear All
            </Button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading reports...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-2xl">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <h3 className="mt-4 font-semibold">No complaints found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or be the first to post.</p>
            </div>
          ) : (
            complaints.map((c) => <PostCard key={c.id} complaint={c} onUpdate={fetchComplaints} />)
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="rounded-2xl border bg-gradient-primary p-6 text-primary-foreground shadow-glow">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Safety First
            </h3>
            <p className="text-xs mt-2 opacity-90 leading-relaxed">
              FairGig community is here to support you. Reports filed here are reviewed by our legal advocates. 
              Avoid sharing personal contact info in public posts.
            </p>
          </div>
          
          <div className="rounded-2xl border bg-card p-5 shadow-elegant">
            <h4 className="text-sm font-semibold mb-4">Trending Issues</h4>
            <div className="space-y-4">
               {complaints.slice(0, 3).map((c, i) => (
                 <div key={i} className="flex gap-3 group cursor-pointer">
                   <div className="h-8 w-8 rounded bg-muted grid place-items-center text-xs font-bold shrink-0 group-hover:bg-primary-soft group-hover:text-primary transition-colors">#{i+1}</div>
                   <div>
                     <div className="text-xs font-semibold line-clamp-1">{c.title}</div>
                     <div className="text-[10px] text-muted-foreground mt-0.5">{c.upvote_count} workers affected</div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function PostCard({ complaint, onUpdate }: { complaint: any; onUpdate: () => void }) {
  const [upvotes, setUpvotes] = useState(complaint.upvote_count);
  const [isUpvoted, setIsUpvoted] = useState(complaint.is_upvoted || false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync state with props when data is refetched
  useEffect(() => {
    setUpvotes(complaint.upvote_count);
    setIsUpvoted(complaint.is_upvoted || false);
  }, [complaint.upvote_count, complaint.is_upvoted]);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.grievance.upvote(complaint.id);
      setUpvotes(res.upvote_count);
      setIsUpvoted(res.added);
    } catch (err) {
      toast.error("Please log in to vote");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/worker/community?complaint=${complaint.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FairGig Report: ${complaint.title}`,
          text: "Check out this worker report on FairGig",
          url: url,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(url);
          setIsCopied(true);
          toast.success("Link copied!");
          setTimeout(() => setIsCopied(false), 2000);
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    setLoadingComments(true);
    try {
      const data = await api.grievance.getComments(complaint.id);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newComment.trim()) return;
    setIsPostingComment(true);
    try {
      const comment = await api.grievance.addComment(complaint.id, newComment);
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <article className="rounded-2xl border bg-card shadow-elegant overflow-hidden transition-all hover:border-primary/20">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-primary-soft text-primary font-bold">
                {complaint.poster_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{complaint.poster_name}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{complaint.platform}</span>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>{complaint.city_zone || "General"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          
          <TagBadge variant={complaint.status === "RESOLVED" ? "success" : complaint.status === "ESCALATED" ? "warning" : "info"} dot className="uppercase text-[9px] tracking-wider">
            {complaint.status}
          </TagBadge>
        </div>

        <h3 className="mt-4 font-bold text-lg leading-tight">{complaint.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {complaint.description}
        </p>

        {complaint.images && complaint.images.length > 0 && (
          <div className={cn("mt-4 grid gap-2", complaint.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
             {complaint.images.map((img: string, i: number) => (
               <div key={i} className="rounded-xl border overflow-hidden bg-muted aspect-video cursor-zoom-in">
                  <img src={img} className="h-full w-full object-cover transition-transform hover:scale-105" />
               </div>
             ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button 
               variant={isUpvoted ? "primary" : "ghost"} 
               size="sm" 
               className={cn("h-9 gap-1.5 font-bold transition-all", isUpvoted && "bg-primary text-white shadow-glow")} 
               onClick={handleUpvote}
            >
              <ArrowBigUp className={cn("h-5 w-5", isUpvoted && "fill-current")} />
              <span className="tabular-nums">{upvotes}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground hover:text-primary font-medium" onClick={loadComments}>
              <MessageSquare className="h-4 w-4" />
              {complaint.comment_count || comments.length > 0 ? comments.length : "Discuss"}
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" className={cn("h-9 gap-1.5 text-xs transition-colors", isCopied ? "text-primary font-medium" : "text-muted-foreground hover:text-primary")} onClick={handleShare}>
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {isCopied ? "Link Copied" : "Share Report"}
          </Button>
        </div>
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="bg-muted/30 border-t animate-in slide-in-from-top duration-300">
          <div className="p-5 space-y-4">
             {loadingComments ? (
               <div className="py-4 text-center">
                 <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
               </div>
             ) : comments.length === 0 ? (
               <p className="text-xs text-center py-4 text-muted-foreground font-medium">No discussion yet. Start the conversation!</p>
             ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <Avatar className="h-8 w-8 border">
                        <AvatarFallback className="text-[10px] bg-background">
                          {comment.author_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold">{comment.author_name}</span>
                           <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm mt-0.5 text-foreground/90">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
             )}

             <div className="flex gap-3 pt-4 border-t border-muted">
                <Input 
                   placeholder="Add a comment..." 
                   className="h-9 text-sm bg-background border-muted" 
                   value={newComment}
                   onChange={(e) => setNewComment(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleAddComment(e)}
                />
                <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={handleAddComment} disabled={isPostingComment}>
                  {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
             </div>
          </div>
        </div>
      )}
    </article>
  );
}

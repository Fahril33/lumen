/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  type FormEvent,
} from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatRequests } from "@/hooks/use-chat-requests";
import {
  useFriendships,
  useChats,
  useChatMessages,
  useStarredMessages,
} from "@/hooks/use-friend-chat";
import {
  useIncomingTeamInvitations,
  useRespondToTeamInvitation,
} from "@/hooks/use-team-invitations";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { useChatDrafts } from "@/hooks/use-chat-drafts";
import { usePresenceStore } from "@/stores/presence-store";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./chat-input";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials, cn } from "@/lib/utils";
import { InvitationInboxPanel } from "@/features/chat/invitation-inbox-panel";
import { NewChatDialog } from "@/features/chat/new-chat-dialog";
import { ChatContactPopover } from "@/features/chat/chat-contact-popover";
import { ChatListItem } from "@/features/chat/chat-list-item";
import { MessageBubble } from "@/features/chat/message-bubble";
import { FilePreviewDialog } from "@/features/chat/file-preview-dialog";
import { TypingIndicator } from "@/features/chat/typing-indicator";
import { ReplyPreviewBar } from "@/features/chat/reply-preview-bar";
import { EmojiPicker } from "@/features/chat/emoji-picker";
import { toast } from "sonner";
import {
  MessageCircle,
  Users,
  Plus,
  Send,
  Paperclip,
  Loader2,
  SmilePlus,
  MessageSquare,
  UserPlus,
  Inbox,
  Check,
  ArrowDown,
  ChevronLeft,
  ChevronUp,
  X,
  MoreVertical,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ChatMessageWithProfile } from "@/types/database";

// --- Sub-components for performance optimization ---

interface ChatSidebarProps {
  isDesktop: boolean;
  activeConversation: any;
  activeTab: "chats" | "friends";
  setActiveTab: (tab: "chats" | "friends") => void;
  pendingFriendRequests: any[];
  chats: any[];
  isChatListLoading: boolean;
  isInboxActive: boolean;
  inboxCount: number;
  setActiveConversation: (conv: any) => void;
  setShowNewChat: (show: boolean) => void;
  isFriendListLoading: boolean;
  searchUsername: string;
  setSearchUsername: (val: string) => void;
  sendFriendRequest: any;
  acceptedFriends: any[];
  updateFriendship: any;
  handleStartChat: (id: string) => void;
  user: any;
  handleDeleteChat: () => void;
}

const ChatSidebar = React.memo(({
  isDesktop,
  activeConversation,
  activeTab,
  setActiveTab,
  pendingFriendRequests,
  chats,
  isChatListLoading,
  isInboxActive,
  inboxCount,
  setActiveConversation,
  setShowNewChat,
  isFriendListLoading,
  searchUsername,
  setSearchUsername,
  sendFriendRequest,
  acceptedFriends,
  updateFriendship,
  handleStartChat,
  user,
  handleDeleteChat
}: ChatSidebarProps) => {
  function getChatName(chat: any) {
    if (chat.is_group) return chat.name || "Group Chat";
    const other = chat.participants?.find(
      (p: any) => p.profiles.id !== user?.id,
    )?.profiles;
    return other ? other.full_name || other.username : "Unknown User";
  }

  function getChatAvatar(chat: any) {
    if (chat.is_group) return chat.avatar_url;
    const other = chat.participants?.find(
      (p: any) => p.profiles.id !== user?.id,
    )?.profiles;
    return other?.avatar_url;
  }

  return (
    <div
      className={cn(
        "border-r border-border bg-card/30 shrink-0 flex-col h-full",
        !isDesktop && activeConversation ? "hidden" : "flex",
        isDesktop ? "w-80" : "w-full"
      )}
    >
      <div className="p-3 border-b border-border flex flex-col gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "chats" | "friends")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats" className="gap-2">
              <MessageCircle className="w-4 h-4" /> Chats
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="w-4 h-4" /> Friends
              {pendingFriendRequests.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {pendingFriendRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {activeTab === "chats" ? (
          <div className="p-2 space-y-1">
            <div className="px-2 pb-2 pt-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Conversations
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowNewChat(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveConversation({ type: "inbox" })}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                isInboxActive
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/60 bg-card/50 hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Inbox className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      Inbox
                    </span>
                    {inboxCount > 0 ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {inboxCount > 99 ? "99+" : inboxCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Chat request dan undangan tim masuk
                  </p>
                </div>
              </div>
            </button>
            {isChatListLoading ? (
              Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl p-2"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-3 flex-1" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No chats yet.
              </div>
            ) : (
              chats.map((chat: any) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeConversation?.id === chat.id}
                  currentUserId={user?.id}
                  onSelect={() =>
                    setActiveConversation({ type: "chat", id: chat.id })
                  }
                  onDeleteChat={handleDeleteChat}
                  getChatName={getChatName}
                  getChatAvatar={getChatAvatar}
                />
              ))
            )}
          </div>
        ) : (
          <div className="p-2 space-y-4">
            <div className="px-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchUsername)
                    sendFriendRequest.mutate(searchUsername);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Add friend by username..."
                  value={searchUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchUsername(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 px-3"
                  disabled={!searchUsername || sendFriendRequest.isPending}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </form>
            </div>

            {isFriendListLoading ? (
              <div className="space-y-4 px-2">
                <Skeleton className="h-8 w-full" />
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg p-2"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              pendingFriendRequests.length > 0 && (
                <div>
                  <div className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Friend Requests
                  </div>
                  {pendingFriendRequests.map((req: any) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-accent/30 mx-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {getInitials((req as any).requester?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {(req as any).requester?.username}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-500"
                          onClick={() =>
                            updateFriendship.mutate({
                              id: req.id,
                              status: "accepted",
                            })
                          }
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() =>
                            updateFriendship.mutate({
                              id: req.id,
                              status: "blocked",
                            })
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            <div>
              <div className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">
                My Friends
              </div>
              {isFriendListLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="mx-2 flex items-center justify-between rounded-lg p-2"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                ))
              ) : acceptedFriends.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No friends yet. Add some!
                </div>
              ) : (
                acceptedFriends.map((f: any) => {
                  const friend =
                    f.requester_id === user?.id
                      ? (f as any).recipient
                      : (f as any).requester;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 mx-2 group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <ChatContactPopover
                          contact={friend}
                          onOpenChat={handleStartChat}
                          size="sm"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {friend.full_name || friend.username}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            @{friend.username}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleStartChat(friend.id)}
                      >
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
});

interface ChatRoomProps {
  activeConversation: { id: string };
  user: any;
  isDesktop: boolean;
  setActiveConversation: (conv: any) => void;
  handleBlockContact: (id: string) => void;
  chats: any[];
}

const ChatRoom = React.memo(({
  activeConversation,
  user,
  isDesktop,
  setActiveConversation,
  handleBlockContact,
  chats
}: ChatRoomProps) => {
  const activeChatId = activeConversation.id;
  const activeChat = useMemo(
    () => chats.find((c: any) => c.id === activeChatId),
    [chats, activeChatId]
  );

  const [messageText, setMessageText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessageWithProfile | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const {
    messagesQuery,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleStar,
    toggleReaction,
    uploadFile,
    markAsRead,
    fetchOlderMessages,
    hasOlderMessages,
    isFetchingOlderMessages,
  } = useChatMessages(activeChatId);

  const starredQuery = useStarredMessages(activeChatId);
  const starredIds = useMemo(
    () => starredQuery.data ?? new Set<string>(),
    [starredQuery.data]
  );
  const { typingUsers, setTyping } = useTypingIndicator(activeChatId);
  const otherUser = useMemo(() => {
    if (!activeChat || activeChat.is_group) return null;
    return activeChat.participants?.find((p: any) => p.profiles.id !== user?.id)
      ?.profiles;
  }, [activeChat, user?.id]);

  const isOnline = usePresenceStore((s) =>
    otherUser ? s.onlineUsers.has(otherUser.id) : false,
  );
  const isTyping = typingUsers.length > 0;
  const canReact = !!activeChat && !activeChat.is_group;

  const isMessagesLoading =
    messagesQuery.isLoading ||
    (messagesQuery.isFetching && messages.length === 0);
  const hasUnreadIncomingMessages = useMemo(
    () =>
      messages.some(
        (message) => message.user_id !== user?.id && message.status !== "read",
      ),
    [messages, user?.id],
  );

  const { draft: savedDraft, updateDraft, clearDraft } = useChatDrafts(activeChatId);
  const { isAtBottom, distanceFromBottom, scrollToBottom } = useChatScroll(
    chatScrollAreaRef,
    messagesEndRef,
    activeChatId,
    messages.length,
    isMessagesLoading,
  );

  useEffect(() => {
    if (activeChatId) setMessageText(savedDraft);
  }, [activeChatId, savedDraft]);

  useEffect(() => {
    if (!activeChatId || isMessagesLoading || !isAtBottom || !hasUnreadIncomingMessages || markAsRead.isPending) return;
    markAsRead.mutate();
  }, [activeChatId, hasUnreadIncomingMessages, isAtBottom, isMessagesLoading, markAsRead]);

  useEffect(() => {
    if (!activeChatId || !sendMessage.isSuccess) return;
    scrollToBottom("smooth");
  }, [activeChatId, messages.length, scrollToBottom, sendMessage.isSuccess]);

  // Click outside emoji picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
    }
    if (showEmoji) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);

  const handleMessageChange = useCallback(
    (val: string) => {
      setMessageText(val);
      updateDraft(val);
      if (val.trim()) setTyping(true);
      else setTyping(false);
    },
    [updateDraft, setTyping],
  );

  function insertEmoji(emoji: string) {
    const newVal = messageText + emoji;
    setMessageText(newVal);
    updateDraft(newVal);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!messageText.trim()) return;
    const nextMessage = messageText.trim();
    const replyId = replyingTo?.id;
    setMessageText("");
    clearDraft();
    setShowEmoji(false);
    setReplyingTo(null);
    setTyping(false);
    scrollToBottom("smooth");
    sendMessage.mutate(
      { content: nextMessage, replyToId: replyId },
      { onSuccess: () => scrollToBottom("smooth") },
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSend(file: File, caption: string) {
    try {
      setIsUploading(true);
      setPreviewFile(null);
      const { url, name, type } = await uploadFile(file);
      const replyId = replyingTo?.id;
      setReplyingTo(null);
      clearDraft();
      sendMessage.mutate({
        content: caption || `📎 ${name}`,
        fileUrl: url,
        fileName: name,
        fileType: type,
        replyToId: replyId,
      });
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }

  const handleReply = useCallback((msg: ChatMessageWithProfile) => {
    setReplyingTo(msg);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleEdit = useCallback((messageId: string, content: string) => {
    editMessage.mutate({ messageId, content });
  }, [editMessage]);

  const handleDelete = useCallback((messageId: string) => {
    deleteMessage.mutate(messageId);
  }, [deleteMessage]);

  const handleToggleStar = useCallback((messageId: string, currentlyStarred: boolean) => {
    toggleStar.mutate({ messageId, starred: currentlyStarred });
  }, [toggleStar]);

  const scrollToMessage = useCallback((messageId: string) => {
    const viewport = chatScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    const el = viewport?.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-message");
      setTimeout(() => el.classList.remove("highlight-message"), 2000);
    }
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    toggleReaction.mutate({ messageId, emoji });
  }, [toggleReaction]);

  const messageById = useMemo(() => {
    const map = new Map<string, ChatMessageWithProfile>();
    for (const msg of messages) map.set(msg.id, msg as any);
    return map;
  }, [messages]);

  const renderMessages = useMemo(() => {
    const out: Array<{ msg: ChatMessageWithProfile; showHeader: boolean }> = [];
    for (let i = 0; i < messages.length; i += 1) {
      const msg = messages[i] as any as ChatMessageWithProfile;
      const prevMsg = messages[i - 1] as any as ChatMessageWithProfile | undefined;
      const showHeader = !prevMsg || prevMsg.user_id !== msg.user_id ||
        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000;
      
      let enrichedMsg = msg;
      if ((msg as any).reply_to_id) {
        const parentMsg = messageById.get((msg as any).reply_to_id as any);
        if (parentMsg && ((msg as any).reply_to as any)?.id !== parentMsg.id) {
          enrichedMsg = { ...msg, reply_to: parentMsg };
        }
      } else if ((msg as any).reply_to) {
        enrichedMsg = { ...msg, reply_to: null };
      }
      out.push({ msg: enrichedMsg, showHeader });
    }
    return out;
  }, [messages, messageById]);

  function getChatName(chat: any) {
    if (chat.is_group) return chat.name || "Group Chat";
    const other = chat.participants?.find((p: any) => p.profiles.id !== user?.id)?.profiles;
    return other ? other.full_name || other.username : "Unknown User";
  }

  function getChatAvatar(chat: any) {
    if (chat.is_group) return chat.avatar_url;
    const other = chat.participants?.find((p: any) => p.profiles.id !== user?.id)?.profiles;
    return other?.avatar_url;
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="sticky top-0 h-16 border-b border-border px-4 md:px-5 flex items-center gap-3 md:gap-4 bg-card/85 backdrop-blur shrink-0 shadow-sm z-30 [padding-top:max(env(safe-area-inset-top),0px)]">
        {!isDesktop && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => setActiveConversation(null)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}

        <ChatContactPopover
          contact={otherUser}
          onBlock={handleBlockContact}
          customTrigger={
            <div className="flex items-center gap-3 md:gap-4 hover:bg-accent/50 p-1.5 -ml-1.5 rounded-xl transition-colors min-w-0 cursor-pointer">
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border border-border/50">
                  <AvatarImage src={getChatAvatar(activeChat) ?? undefined} />
                  <AvatarFallback>{getInitials(getChatName(activeChat))}</AvatarFallback>
                </Avatar>
                {isOnline && (
                  <span className="absolute bottom-0.5 right-0.5 block w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-base leading-tight truncate">
                  {getChatName(activeChat)}
                </h2>
                <p className={`text-xs truncate ${isTyping ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
                  {isTyping ? (
                    <span className="animate-pulse">typing...</span>
                  ) : isOnline ? (
                    <span className="text-primary font-medium">Online</span>
                  ) : activeChat.is_group ? (
                    `${activeChat.participants?.length} participants`
                  ) : (
                    "Friend"
                  )}
                </p>
              </div>
            </div>
          }
        />

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => useAppShellStore.getState().toggleMute()}
                className="gap-2"
              >
                {useAppShellStore((s) => s.isMuted) ? (
                  <>
                    <Volume2 className="w-4 h-4" /> Unmute
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" /> Mute
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveConversation(null)}
                className="md:hidden text-destructive gap-2"
              >
                Tutup Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea
        ref={chatScrollAreaRef}
        className="relative min-h-0 flex-1 px-4 md:px-6 z-10"
      >
        <div className="py-4">
          {hasOlderMessages && (
            <div className="sticky top-0 z-10 flex justify-center py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-background/90 backdrop-blur"
                onClick={() => void fetchOlderMessages()}
                disabled={isFetchingOlderMessages}
              >
                {isFetchingOlderMessages ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronUp className="mr-2 h-4 w-4" />
                )}
                Load older messages
              </Button>
            </div>
          )}
          {isMessagesLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={`flex w-full mb-4 ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <div className="flex max-w-[75%] gap-2">
                    {index % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                    <div className="space-y-2">
                      {index % 2 === 0 && <Skeleton className="h-3 w-20" />}
                      <Skeleton className={`h-16 rounded-2xl ${index % 2 === 0 ? "w-64" : "w-52"}`} />
                    </div>
                  </div>
                </div>
              ))
            : messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm bg-muted/50 inline-block px-3 py-1 rounded-full">
                    This is the beginning of your chat
                  </p>
                </div>
              )}
          {renderMessages.map(({ msg, showHeader }) => (
            <MessageBubble
              key={msg.id}
              message={msg as any}
              showHeader={showHeader}
              isOwn={msg.user_id === user?.id}
              isStarred={starredIds.has(msg.id)}
              canReact={canReact}
              currentUserId={user?.id}
              onReact={reactToMessage}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStar={handleToggleStar}
              onScrollToMessage={scrollToMessage}
            />
          ))}
          <TypingIndicator typingUsers={typingUsers} />
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {!isAtBottom && distanceFromBottom > 160 && messages.length > 0 && (
          <div className="pointer-events-none absolute bottom-6 right-6 flex justify-end animate-in fade-in zoom-in slide-in-from-bottom-2">
            <Button
              size="icon"
              className="pointer-events-auto h-11 w-11 rounded-full shadow-xl bg-background border border-border text-foreground hover:bg-accent"
              onClick={() => scrollToBottom("smooth")}
            >
              <ArrowDown className="w-5 h-5" />
            </Button>
          </div>
        )}
      </ScrollArea>

      {replyingTo && (
        <ReplyPreviewBar
          message={replyingTo}
          isOwnMessage={replyingTo.user_id === user?.id}
          onCancel={() => setReplyingTo(null)}
        />
      )}

      <div className="sticky bottom-0 border-t border-border bg-card/88 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur shrink-0 z-30">
        <form
          onSubmit={handleSend}
          className="max-w-4xl mx-auto flex items-center gap-2 bg-background border border-border rounded-2xl p-1.5 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-muted h-11 w-11" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
          </Button>

          <div className="relative" ref={emojiPickerRef}>
            <Button type="button" variant="ghost" size="icon" className={`shrink-0 rounded-xl transition-colors h-11 w-11 ${showEmoji ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`} onClick={() => setShowEmoji(!showEmoji)}>
              <SmilePlus className="w-5 h-5" />
            </Button>
            {showEmoji && (
              <div className="absolute bottom-14 left-0 z-50">
                <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
              </div>
            )}
          </div>

          <ChatInput
            value={messageText}
            onChange={handleMessageChange}
            onSend={() => handleSend(new Event('submit') as any)}
            placeholder="Type a message..."
            className="flex-1"
            onFocus={() => setShowEmoji(false)}
          />

          <Button type="submit" size="icon" disabled={!messageText.trim() || sendMessage.isPending} className="shrink-0 rounded-xl h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </form>
      </div>

      <FilePreviewDialog file={previewFile} open={!!previewFile} onClose={() => setPreviewFile(null)} onSend={handleFileSend} isSending={isUploading} />
    </div>
  );
});

export function ChatView() {
  const user = useAuthStore((s) => s.user);
  const { isDesktop, isMobile } = useResponsiveLayout();
  const { setMobileBottomNavVisible } = useAppShellStore();
  const [activeTab, setActiveTab] = useState<"chats" | "friends">("chats");
  const [activeConversation, setActiveConversation] = useState<
    { type: "inbox" } | { type: "chat"; id: string } | null
  >(null);

  const { friendshipsQuery, sendFriendRequest, updateFriendship } = useFriendships();
  const { chatsQuery, createChat } = useChats();
  const { chatRequestsQuery, respondToChatRequestMutation } = useChatRequests();
  const { invitationsQuery: incomingTeamInvitationsQuery } = useIncomingTeamInvitations();
  const { respondToTeamInvitationMutation } = useRespondToTeamInvitation();

  const [searchUsername, setSearchUsername] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const friendships = useMemo(() => friendshipsQuery.data ?? [], [friendshipsQuery.data]);
  const incomingChatRequests = useMemo(() => chatRequestsQuery.data ?? [], [chatRequestsQuery.data]);
  const incomingTeamInvitations = useMemo(() => incomingTeamInvitationsQuery.data ?? [], [incomingTeamInvitationsQuery.data]);

  const pendingFriendRequests = friendships.filter((f: any) => f.status === "pending" && f.recipient_id === user?.id);
  const acceptedFriends = friendships.filter((f: any) => f.status === "accepted");
  const inboxCount = incomingChatRequests.length + incomingTeamInvitations.length;

  const isChatListLoading = chatsQuery.isLoading;
  const isFriendListLoading = friendshipsQuery.isLoading;
  const isInboxLoading = chatRequestsQuery.isLoading || incomingTeamInvitationsQuery.isLoading;
  const isInboxActive = activeConversation?.type === "inbox";

  useEffect(() => {
    if (!isMobile) {
      setMobileBottomNavVisible(true);
      return;
    }
    setMobileBottomNavVisible(!activeConversation);
    return () => setMobileBottomNavVisible(true);
  }, [activeConversation, isMobile, setMobileBottomNavVisible]);

  const handleStartChat = useCallback(async (friendId: string) => {
    const existing = chats.find((chat: any) => !chat.is_group && chat.participants?.some((p: any) => p.profiles.id === friendId));
    if (existing) {
      setActiveConversation({ type: "chat", id: existing.id });
      setActiveTab("chats");
      setShowNewChat(false);
    } else {
      createChat.mutate(
        { participantIds: [friendId], isGroup: false },
        {
          onSuccess: (newChat: any) => {
            setActiveConversation({ type: "chat", id: newChat.id });
            setActiveTab("chats");
            setShowNewChat(false);
          },
        }
      );
    }
  }, [chats, createChat]);

  const handleAcceptChatRequest = useCallback((requestId: string) => {
    respondToChatRequestMutation.mutate({ requestId, action: "accepted" }, {
      onSuccess: (chatId) => {
        if (chatId) {
          setActiveConversation({ type: "chat", id: chatId });
          setActiveTab("chats");
        }
      },
    });
  }, [respondToChatRequestMutation]);

  const handleRejectChatRequest = useCallback((requestId: string) => {
    respondToChatRequestMutation.mutate({ requestId, action: "rejected" });
  }, [respondToChatRequestMutation]);

  const handleAcceptTeamInvitation = useCallback((invitationId: string) => {
    respondToTeamInvitationMutation.mutate({ invitationId, action: "accepted" });
  }, [respondToTeamInvitationMutation]);

  const handleRejectTeamInvitation = useCallback((invitationId: string) => {
    respondToTeamInvitationMutation.mutate({ invitationId, action: "rejected" });
  }, [respondToTeamInvitationMutation]);

  const handleBlockContact = useCallback((contactId: string) => {
    updateFriendship.mutate({ id: contactId, status: "blocked" });
    toast.success("User blocked");
  }, [updateFriendship]);

  const handleDeleteChat = useCallback(() => {
    setActiveConversation(null);
    toast.success("Chat removed from view");
  }, []);

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      <ChatSidebar
        isDesktop={isDesktop}
        activeConversation={activeConversation}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingFriendRequests={pendingFriendRequests}
        chats={chats}
        isChatListLoading={isChatListLoading}
        isInboxActive={isInboxActive}
        inboxCount={inboxCount}
        setActiveConversation={setActiveConversation}
        setShowNewChat={setShowNewChat}
        isFriendListLoading={isFriendListLoading}
        searchUsername={searchUsername}
        setSearchUsername={setSearchUsername}
        sendFriendRequest={sendFriendRequest}
        acceptedFriends={acceptedFriends}
        updateFriendship={updateFriendship}
        handleStartChat={handleStartChat}
        user={user}
        handleDeleteChat={handleDeleteChat}
      />

      <div className={cn(
        "bg-background relative z-10 flex-1 min-w-0 flex flex-col h-full",
        !isDesktop && !activeConversation && "hidden"
      )}>
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm px-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Lumen: Chat</h2>
              <p className="text-sm text-muted-foreground">
                Select a friend, open a recent chat, or send a new request by
                username to start messaging directly across the platform.
              </p>
              <Button onClick={() => setShowNewChat(true)}>Start a new chat</Button>
            </div>
          </div>
        ) : isInboxActive ? (
          <>
            {!isDesktop && (
              <div className="sticky top-0 z-30 border-b border-border bg-card/85 px-4 py-3 backdrop-blur [padding-top:max(env(safe-area-inset-top),0px)]">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setActiveConversation(null)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </div>
            )}
            <InvitationInboxPanel
              chatRequests={incomingChatRequests}
              teamInvitations={incomingTeamInvitations}
              isLoading={isInboxLoading}
              respondingChatRequestId={respondToChatRequestMutation.variables?.requestId}
              respondingTeamInvitationId={respondToTeamInvitationMutation.variables?.invitationId}
              onAcceptChatRequest={handleAcceptChatRequest}
              onRejectChatRequest={handleRejectChatRequest}
              onAcceptTeamInvitation={handleAcceptTeamInvitation}
              onRejectTeamInvitation={handleRejectTeamInvitation}
            />
          </>
        ) : (
          <ChatRoom
            activeConversation={activeConversation as { id: string }}
            user={user}
            isDesktop={isDesktop}
            setActiveConversation={setActiveConversation}
            handleBlockContact={handleBlockContact}
            chats={chats}
          />
        )}
      </div>

      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        acceptedFriends={acceptedFriends}
        currentUserId={user?.id}
        onStartChat={handleStartChat}
        isLoading={isFriendListLoading}
      />
    </div>
  );
}

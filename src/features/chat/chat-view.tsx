/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useMemo, type FormEvent } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useChatRequests } from '@/hooks/use-chat-requests'
import { useFriendships, useChats, useChatMessages } from '@/hooks/use-friend-chat'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { useAppShellStore } from '@/stores/app-shell-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getInitials } from '@/lib/utils'
import { ChatRequestPopover } from '@/features/chat/chat-request-popover'
import { NewChatDialog } from '@/features/chat/new-chat-dialog'
import { ChatContactPopover } from '@/features/chat/chat-contact-popover'
import { format } from 'date-fns'
import {
  MessageCircle,
  Users,
  Plus,
  Send,
  Paperclip,
  Loader2,
  ImageIcon,
  FileIcon,
  SmilePlus,
  MessageSquare,
  UserPlus,
  Check,
  ArrowDown,
  ChevronLeft,
  X
} from 'lucide-react'
import type { ChatMessageWithProfile } from '@/types/database'

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '✅', '👀', '💯', '🚀', '💪', '🙏', '👏']

export function ChatView() {
  const user = useAuthStore((s) => s.user)
  const { isDesktop, isMobile } = useResponsiveLayout()
  const { setMobileBottomNavVisible } = useAppShellStore()
  const [activeTab, setActiveTab] = useState<'chats'|'friends'>('chats')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  
  const { friendshipsQuery, sendFriendRequest, updateFriendship } = useFriendships()
  const { chatsQuery, createChat } = useChats()
  const { chatRequestsQuery, respondToChatRequestMutation } = useChatRequests()
  
  const [messageText, setMessageText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchUsername, setSearchUsername] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)

  const chatScrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data])
  const friendships = useMemo(() => friendshipsQuery.data ?? [], [friendshipsQuery.data])
  const incomingChatRequests = useMemo(() => chatRequestsQuery.data ?? [], [chatRequestsQuery.data])
  const isChatListLoading = chatsQuery.isLoading
  const isFriendListLoading = friendshipsQuery.isLoading
  const isChatRequestsLoading = chatRequestsQuery.isLoading

  const pendingFriendRequests = friendships.filter((f: any) => f.status === 'pending' && f.recipient_id === user?.id)
  const acceptedFriends = friendships.filter((f: any) => f.status === 'accepted')

  function insertEmoji(emoji: string) {
    setMessageText((prev) => prev + emoji)
    setShowEmoji(false)
  }

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId])
  const { messagesQuery, sendMessage, uploadFile, markAsRead } = useChatMessages(activeChatId ?? undefined)
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])
  const isMessagesLoading = messagesQuery.isLoading || messagesQuery.isFetching
  const hasUnreadIncomingMessages = useMemo(
    () => messages.some((message) => message.user_id !== user?.id && message.status !== 'read'),
    [messages, user?.id]
  )

  const { isAtBottom, distanceFromBottom, scrollToBottom } = useChatScroll(
    chatScrollAreaRef,
    messagesEndRef,
    activeChatId ?? undefined,
    messages.length,
    isMessagesLoading
  )

  useEffect(() => {
    if (!activeChatId) return
    if (isMessagesLoading) return
    if (!isAtBottom) return
    if (!hasUnreadIncomingMessages) return
    if (markAsRead.isPending) return

    markAsRead.mutate()
  }, [activeChatId, hasUnreadIncomingMessages, isAtBottom, isMessagesLoading, markAsRead])

  useEffect(() => {
    if (!isMobile) {
      setMobileBottomNavVisible(true)
      return
    }

    setMobileBottomNavVisible(!activeChat)

    return () => {
      setMobileBottomNavVisible(true)
    }
  }, [activeChat, isMobile, setMobileBottomNavVisible])

  useEffect(() => {
    if (!activeChatId || !sendMessage.isSuccess) return
    scrollToBottom('smooth')
  }, [activeChatId, messages.length, scrollToBottom, sendMessage.isSuccess])

  function getChatName(chat: any) {
    if (chat.is_group) return chat.name || 'Group Chat'
    // For DM, find the other participant
    const other = chat.participants?.find((p: any) => p.profiles.id !== user?.id)?.profiles
    return other ? (other.full_name || other.username) : 'Unknown User'
  }

  function getChatAvatar(chat: any) {
    if (chat.is_group) return chat.avatar_url
    const other = chat.participants?.find((p: any) => p.profiles.id !== user?.id)?.profiles
    return other?.avatar_url
  }

  function getChatContact(chat: any) {
    if (chat.is_group) return null
    return chat.participants?.find((p: any) => p.profiles.id !== user?.id)?.profiles ?? null
  }

  function findExistingDirectChat(friendId: string) {
    return chats.find((chat: any) =>
      !chat.is_group &&
      chat.participants?.some((p: any) => p.profiles.id === friendId) &&
      chat.participants?.some((p: any) => p.profiles.id === user?.id)
    )
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!messageText.trim()) return
    const nextMessage = messageText.trim()
    setMessageText('')
    setShowEmoji(false)
    scrollToBottom('smooth')
    sendMessage.mutate(
      { content: nextMessage },
      {
        onSuccess: () => {
          scrollToBottom('smooth')
        },
      }
    )
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const { url, name, type } = await uploadFile(file)
      sendMessage.mutate({
        content: `📎 ${name}`,
        fileUrl: url,
        fileName: name,
        fileType: type,
      })
    } catch {
      // toast handles error
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleStartChat(friendId: string) {
    const existing = findExistingDirectChat(friendId)

    if (existing) {
      setActiveChatId(existing.id)
      setActiveTab('chats')
      setShowNewChat(false)
    } else {
      createChat.mutate({ participantIds: [friendId], isGroup: false }, {
        onSuccess: (newChat: any) => {
          setActiveChatId(newChat.id)
          setActiveTab('chats')
          setShowNewChat(false)
        }
      })
    }
  }

  function handleAcceptChatRequest(requestId: string) {
    respondToChatRequestMutation.mutate(
      { requestId, action: 'accepted' },
      {
        onSuccess: (chatId) => {
          if (chatId) {
            setActiveChatId(chatId)
            setActiveTab('chats')
          }
        },
      }
    )
  }

  function handleRejectChatRequest(requestId: string) {
    respondToChatRequestMutation.mutate({ requestId, action: 'rejected' })
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      <div
        className={`border-r border-border bg-card/30 shrink-0 ${
          !isDesktop && activeChat ? 'hidden' : 'flex'
        } ${isDesktop ? 'w-80' : 'w-full'} flex-col`}
      >
        <div className="p-3 border-b border-border flex flex-col gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chats'|'friends')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chats" className="gap-2"><MessageCircle className="w-4 h-4"/> Chats</TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users className="w-4 h-4"/> Friends
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
          {activeTab === 'chats' ? (
            <div className="p-2 space-y-1">
              <div className="px-2 pb-2 pt-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Recent</span>
                <div className="flex items-center gap-1">
                  <ChatRequestPopover
                    requests={incomingChatRequests}
                    onAccept={handleAcceptChatRequest}
                    onReject={handleRejectChatRequest}
                    isPending={respondToChatRequestMutation.isPending}
                    activeRequestId={respondToChatRequestMutation.variables?.requestId}
                    isLoading={isChatRequestsLoading}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewChat(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {isChatListLoading ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-xl p-2">
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
                <div className="p-4 text-center text-muted-foreground text-sm">No chats yet.</div>
              ) : (
                chats.map((chat: any) => {
                  const lastMsg = chat.messages?.[0]
                  const isUnread = lastMsg && lastMsg.user_id !== user?.id && lastMsg.status !== 'read'
                  
                  return (
                    <div
                      key={chat.id}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                        activeChatId === chat.id ? 'bg-primary/10' : 'hover:bg-accent'
                      }`}
                    >
                      <ChatContactPopover
                        contact={getChatContact(chat)}
                        onOpenChat={() => setActiveChatId(chat.id)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveChatId(chat.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-semibold'}`}>{getChatName(chat)}</span>
                          {lastMsg && (
                            <span className={`text-[10px] shrink-0 ml-2 ${isUnread ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                              {format(new Date(lastMsg.created_at), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {lastMsg && lastMsg.user_id === user?.id && (
                              <span className={lastMsg.status === 'read' ? 'text-blue-500' : 'text-muted-foreground'}>
                                {lastMsg.status === 'read' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                                ) : lastMsg.status === 'received' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                )}
                              </span>
                            )}
                            <p className={`text-xs truncate ${isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {lastMsg?.content || 'Say hi!'}
                            </p>
                          </div>
                          {isUnread && chat.unread_count > 0 && (
                            <div className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                              {chat.unread_count}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="p-2 space-y-4">
              <div className="px-2">
                <form onSubmit={(e) => { e.preventDefault(); if (searchUsername) sendFriendRequest.mutate(searchUsername) }} className="flex gap-2">
                  <Input 
                    placeholder="Add friend by username..." 
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="sm" className="h-8 px-3" disabled={!searchUsername || sendFriendRequest.isPending}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </form>
              </div>
              
              {isFriendListLoading ? (
                <div className="space-y-4 px-2">
                  <Skeleton className="h-8 w-full" />
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg p-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : pendingFriendRequests.length > 0 && (
                <div>
                  <div className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">Friend Requests</div>
                  {pendingFriendRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/30 mx-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{getInitials((req as any).requester?.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{(req as any).requester?.username}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => updateFriendship.mutate({ id: req.id, status: 'accepted' })}>
                          <Check className="w-4 h-4"/>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateFriendship.mutate({ id: req.id, status: 'blocked' })}>
                          <X className="w-4 h-4"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">My Friends</div>
                {isFriendListLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="mx-2 flex items-center justify-between rounded-lg p-2">
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
                  <div className="p-4 text-center text-muted-foreground text-sm">No friends yet. Add some!</div>
                ) : (
                  acceptedFriends.map((f: any) => {
                    const friend = f.requester_id === user?.id ? (f as any).recipient : (f as any).requester;
                    return (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 mx-2 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <ChatContactPopover
                            contact={friend}
                            onOpenChat={handleStartChat}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{friend.full_name || friend.username}</span>
                            <span className="text-xs text-muted-foreground truncate">@{friend.username}</span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => handleStartChat(friend.id)}>
                          <MessageCircle className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      <div
        className={`bg-background relative z-10 ${
          !isDesktop && !activeChat ? 'hidden' : 'flex flex-1 min-w-0 flex-col'
        }`}
      >
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm px-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Lumen: Chat</h2>
              <p className="text-sm text-muted-foreground">Select a friend, open a recent chat, or send a new request by username to start messaging directly across the platform.</p>
              <Button onClick={() => setShowNewChat(true)}>Start a new chat</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="sticky top-0 h-16 border-b border-border px-4 md:px-5 flex items-center gap-3 md:gap-4 bg-card/85 backdrop-blur shrink-0 shadow-sm z-30 [padding-top:max(env(safe-area-inset-top),0px)]">
              {!isDesktop ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={() => setActiveChatId(null)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              ) : null}
              <Avatar className="w-10 h-10 border border-border/50">
                <AvatarImage src={getChatAvatar(activeChat) ?? undefined} />
                <AvatarFallback>{getInitials(getChatName(activeChat))}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="font-semibold text-base leading-tight truncate">{getChatName(activeChat)}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeChat.is_group ? `${activeChat.participants?.length} participants` : 'Friend'}
                </p>
              </div>
            </div>

            <ScrollArea
              ref={chatScrollAreaRef}
              className="min-h-0 flex-1 px-4 md:px-6 z-10"
              style={{
                height: isDesktop
                  ? undefined
                  : 'calc(var(--app-height) - 4rem - 5.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
              }}
            >
              <div className="">
                {isMessagesLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className={`flex w-full ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="flex max-w-[75%] gap-2">
                        {index % 2 === 0 ? <Skeleton className="h-8 w-8 rounded-full" /> : null}
                        <div className="space-y-2">
                          {index % 2 === 0 ? <Skeleton className="h-3 w-20" /> : null}
                          <Skeleton className={`h-16 rounded-2xl ${index % 2 === 0 ? 'w-64' : 'w-52'}`} />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : messages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm bg-muted/50 inline-block px-3 py-1 rounded-full">This is the beginning of your chat</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const prevMsg = messages[i - 1]
                  const showHeader = !prevMsg || prevMsg.user_id !== msg.user_id ||
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg as any}
                      showHeader={showHeader}
                      isOwn={msg.user_id === user?.id}
                    />
                  )
                })}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Scroll to bottom floating button */}
              {!isAtBottom && distanceFromBottom > 160 && messages.length > 0 && (
                <div className="pointer-events-none absolute bottom-6 right-6 flex justify-end animate-in fade-in zoom-in slide-in-from-bottom-2">
                  <Button
                    size="icon"
                    className="pointer-events-auto h-11 w-11 rounded-full shadow-xl bg-background border border-border text-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => scrollToBottom('smooth')}
                  >
                    <ArrowDown className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </ScrollArea>

            <div className="sticky bottom-0 border-t border-border bg-card/88 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur shrink-0 z-30">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-2 bg-background border border-border rounded-2xl p-1.5 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-xl hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
                </Button>

                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-xl hover:bg-muted"
                    onClick={() => setShowEmoji(!showEmoji)}
                  >
                    <SmilePlus className="w-5 h-5 text-muted-foreground" />
                  </Button>
                  {showEmoji && (
                    <div className="absolute bottom-14 left-0 bg-popover border border-border rounded-xl p-3 shadow-2xl grid grid-cols-6 gap-2 z-50 animate-in fade-in zoom-in-95">
                      {EMOJI_LIST.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-accent text-xl cursor-pointer hover:scale-110 transition-transform"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent px-2 text-[15px] h-11"
                  onFocus={() => setShowEmoji(false)}
                />
                
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="shrink-0 rounded-xl h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  <Send className="w-5 h-5 ml-1" />
                </Button>
              </form>
            </div>
          </>
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
  )
}

function MessageBubble({
  message,
  showHeader,
  isOwn,
}: {
  message: ChatMessageWithProfile
  showHeader: boolean
  isOwn: boolean
}) {
  const isImage = message.file_type?.startsWith('image/')
  const status = message.status || 'sent'
  const isRequestIntro = message.message_kind === 'request_intro'

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-4' : 'mt-1'}`}>
      <div className={`flex max-w-[75%] md:max-w-[65%] gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="shrink-0 w-8 flex flex-col items-center">
            {showHeader && (
               <Avatar className="w-8 h-8 shadow-sm">
                 <AvatarImage src={message.profiles?.avatar_url ?? undefined} />
                 <AvatarFallback className="text-[10px]">{getInitials(message.profiles?.full_name ?? 'U')}</AvatarFallback>
               </Avatar>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Header */}
          {!isOwn && showHeader && (
             <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
               {message.profiles?.full_name}
             </span>
          )}

          {/* Bubble core */}
          <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm overflow-hidden text-[15px] leading-relaxed ${
            isRequestIntro
              ? 'bg-muted border border-border/60 text-foreground'
              : isOwn 
                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                : 'bg-card border border-border/50 rounded-tl-sm text-card-foreground'
          }`}>
            {isRequestIntro && (
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Request Message
              </div>
            )}
            {message.file_url && isImage ? (
              <div className="my-1 cursor-pointer">
                <img
                  src={message.file_url}
                  alt={message.file_name ?? 'image'}
                  className="max-w-sm w-full rounded-lg object-cover"
                />
              </div>
            ) : message.file_url ? (
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-colors my-1 ${
                  isOwn && !isRequestIntro ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/70 hover:bg-accent'
                }`}
              >
                {message.file_type?.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <FileIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium underline underline-offset-2">{message.file_name}</span>
              </a>
            ) : null}
            {!message.file_url && <p className="wrap-break-word">{message.content}</p>}
            {message.file_url && !message.content.startsWith('📎') && <p className="mt-2 wrap-break-word">{message.content}</p>}
          </div>

          {/* Timestamp and ticks */}
          <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {isOwn && (
              <span className={status === 'read' ? 'text-blue-500' : 'text-muted-foreground'}>
                {status === 'read' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                ) : status === 'received' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo, useCallback, type FormEvent } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useFriendships, useChats, useChatMessages } from '@/hooks/use-friend-chat'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getInitials } from '@/lib/utils'
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
  X
} from 'lucide-react'
import type { ChatMessageWithProfile } from '@/types/database'

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '✅', '👀', '💯', '🚀', '💪', '🙏', '👏']

export function ChatView() {
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<'chats'|'friends'>('chats')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  
  const { friendshipsQuery, sendFriendRequest, updateFriendship } = useFriendships()
  const { chatsQuery, createChat } = useChats()
  
  const [messageText, setMessageText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchUsername, setSearchUsername] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data])
  const friendships = useMemo(() => friendshipsQuery.data ?? [], [friendshipsQuery.data])

  const pendingRequests = friendships.filter((f: any) => f.status === 'pending' && f.recipient_id === user?.id)
  const acceptedFriends = friendships.filter((f: any) => f.status === 'accepted')

  function insertEmoji(emoji: string) {
    setMessageText((prev) => prev + emoji)
    setShowEmoji(false)
  }

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId])
  const { messagesQuery, sendMessage, uploadFile, markAsRead } = useChatMessages(activeChatId ?? undefined)
  const messages = messagesQuery.data ?? []

  const markReadCallback = useCallback(() => {
    if (activeChatId) {
      markAsRead.mutate()
    }
  }, [activeChatId, markAsRead])

  // Attach our modular smart chat-scroll hook
  const { isAtBottom } = useChatScroll(
    messagesEndRef,
    activeChatId ?? undefined,
    messages.length,
    markReadCallback
  )

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

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!messageText.trim()) return
    sendMessage.mutate({ content: messageText.trim() })
    setMessageText('')
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
    // Check if DM already exists
    const existing = chats.find(c => 
      !c.is_group && 
      c.participants?.some((p: any) => p.profiles.id === friendId) &&
      c.participants?.some((p: any) => p.profiles.id === user?.id)
    )

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

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      <div className="w-80 border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="p-3 border-b border-border flex flex-col gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chats'|'friends')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chats" className="gap-2"><MessageCircle className="w-4 h-4"/> Chats</TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users className="w-4 h-4"/> Friends
                {pendingRequests.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {pendingRequests.length}
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
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewChat(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {chats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No chats yet.</div>
              ) : (
                chats.map((chat: any) => {
                  const lastMsg = chat.messages?.[0]
                  const isUnread = lastMsg && lastMsg.user_id !== user?.id && lastMsg.status !== 'read'
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setActiveChatId(chat.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                        activeChatId === chat.id ? 'bg-primary/10' : 'hover:bg-accent'
                      }`}
                    >
                      <Avatar className="w-10 h-10 border border-border/50">
                        <AvatarImage src={getChatAvatar(chat) ?? undefined} />
                        <AvatarFallback>{getInitials(getChatName(chat))}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
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
                      </div>
                    </button>
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
              
              {pendingRequests.length > 0 && (
                <div>
                  <div className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">Friend Requests</div>
                  {pendingRequests.map((req: any) => (
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
                {acceptedFriends.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No friends yet. Add some!</div>
                ) : (
                  acceptedFriends.map((f: any) => {
                    const friend = f.requester_id === user?.id ? (f as any).recipient : (f as any).requester;
                    return (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 mx-2 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
                          </Avatar>
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

      <div className="flex-1 flex flex-col bg-background relative z-10">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm px-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Pusdalops Chat</h2>
              <p className="text-sm text-muted-foreground">Select a friend or chat to start messaging directly across the platform.</p>
              <Button onClick={() => setShowNewChat(true)}>Start a new chat</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 border-b border-border px-5 flex items-center gap-4 bg-card/40 backdrop-blur shrink-0 shadow-sm z-20">
              <Avatar className="w-10 h-10 border border-border/50">
                <AvatarImage src={getChatAvatar(activeChat) ?? undefined} />
                <AvatarFallback>{getInitials(getChatName(activeChat))}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-base leading-tight">{getChatName(activeChat)}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeChat.is_group ? `${activeChat.participants?.length} participants` : 'Friend'}
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 md:px-6 z-10">
              <div className="py-6 space-y-6">
                {messages.length === 0 && (
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
              {!isAtBottom && messages.length > 0 && (
                <div className="sticky bottom-6 flex justify-end mr-4 animate-in fade-in zoom-in slide-in-from-bottom-2">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full shadow-xl bg-background border border-border text-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <ArrowDown className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </ScrollArea>

            <div className="p-4 bg-card/40 border-t border-border shrink-0 z-20">
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

      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
            <DialogDescription>Select friends to start a conversation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <ScrollArea className="max-h-60">
              <div className="space-y-1">
                {acceptedFriends.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">No friends found.</p>
                ) : (
                  acceptedFriends.map((f: any) => {
                    const friend = f.requester_id === user?.id ? (f as any).recipient : (f as any).requester
                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleStartChat(friend.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Avatar className="w-10 h-10 border border-border/50">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="text-sm font-medium truncate">{friend.full_name}</span>
                          <span className="text-xs text-muted-foreground truncate">@{friend.username}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MessageBubble({
  message,
  showHeader,
  isOwn,
}: {
  message: ChatMessageWithProfile & { status?: string }
  showHeader: boolean
  isOwn: boolean
}) {
  const isImage = message.file_type?.startsWith('image/')
  const status = message.status || 'sent'

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
            isOwn 
              ? 'bg-primary text-primary-foreground rounded-tr-sm' 
              : 'bg-card border border-border/50 rounded-tl-sm text-card-foreground'
          }`}>
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
                  isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-muted hover:bg-accent'
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

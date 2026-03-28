export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string
          avatar_url: string | null
          allow_anon_chat: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          full_name?: string
          avatar_url?: string | null
          allow_anon_chat?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          full_name?: string
          avatar_url?: string | null
          allow_anon_chat?: boolean
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string
          avatar_url: string | null
          invite_code: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          avatar_url?: string | null
          invite_code?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string
          avatar_url?: string | null
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
        }
      }
      channels: {
        Row: {
          id: string
          team_id: string
          name: string
          description: string
          is_default: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          description?: string
          is_default?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          content: string
          file_url: string | null
          file_name: string | null
          file_type: string | null
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          content: string
          file_url?: string | null
          file_name?: string | null
          file_type?: string | null
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          is_edited?: boolean
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          team_id: string
          parent_id: string | null
          name: string
          sort_order: number
          is_expanded: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          parent_id?: string | null
          name?: string
          sort_order?: number
          is_expanded?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          parent_id?: string | null
          name?: string
          sort_order?: number
          is_expanded?: boolean
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          team_id: string
          folder_id: string | null
          title: string
          content: Json
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          folder_id?: string | null
          title?: string
          content?: Json
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          folder_id?: string | null
          title?: string
          content?: Json
          sort_order?: number
          updated_by?: string | null
          updated_at?: string
        }
      }
      message_reads: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          last_read_at?: string
        }
        Update: {
          last_read_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          team_id: string
          user_id: string
          type: 'message_sent' | 'note_created' | 'note_updated' | 'folder_created' | 'member_joined' | 'channel_created' | 'file_uploaded'
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          type: 'message_sent' | 'note_created' | 'note_updated' | 'folder_created' | 'member_joined' | 'channel_created' | 'file_uploaded'
          metadata?: Json
          created_at?: string
        }
        Update: {
          metadata?: Json
        }
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          recipient_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          recipient_id: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'blocked'
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          is_group: boolean
          name: string | null
          avatar_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          is_group?: boolean
          name?: string | null
          avatar_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          is_group?: boolean
          name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      chat_participants: {
        Row: {
          chat_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          chat_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          joined_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          content: string
          file_url: string | null
          file_name: string | null
          file_type: string | null
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          content: string
          file_url?: string | null
          file_name?: string | null
          file_type?: string | null
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          is_edited?: boolean
          updated_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Channel = Database['public']['Tables']['channels']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Folder = Database['public']['Tables']['folders']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type ChatInfo = Database['public']['Tables']['chats']['Row']
export type ChatParticipant = Database['public']['Tables']['chat_participants']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

export type MessageWithProfile = Message & { profiles: Profile }
export type ChatMessageWithProfile = ChatMessage & { profiles: Profile }
export type TeamMemberWithProfile = TeamMember & { profiles: Profile }
export type ActivityWithProfile = Activity & { profiles: Profile }
export type FriendshipWithProfile = Friendship & { profiles: Profile }

export interface FolderTreeItem {
  id: string
  name: string
  type: 'folder' | 'note'
  parentId: string | null
  sortOrder: number
  isExpanded?: boolean
  children: FolderTreeItem[]
  data?: Folder | Note
}

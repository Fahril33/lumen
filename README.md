# Pusdalops-IT

> Platform Kolaborasi Tim IT — Pusat Data & Operasional IT

Pusdalops-IT adalah platform kolaborasi real-time untuk tim IT yang mencakup komunikasi tim (chat), pengelolaan catatan/ide (notes) terstruktur dengan folder tree interaktif, dan dashboard aktivitas. Dibangun dengan React 18 + TypeScript, Supabase, dan modern UI/UX.

---

## 🚀 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, shadcn/ui components |
| **Icons** | Lucide React |
| **Backend** | Supabase (Auth, PostgreSQL, Realtime, Storage) |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query v5 |
| **Rich Text Editor** | Tiptap |
| **Drag & Drop** | dnd-kit |
| **Notifications** | Sonner |
| **Utilities** | date-fns, uuid |

---

## ✨ Fitur Utama

### 🔐 Authentication
- Login dengan email/password
- Register dengan profil lengkap
- Magic link (passwordless login)
- Protected routes
- Supabase Auth + Row Level Security

### 👥 Team / Workspace
- Membuat dan bergabung ke multiple teams
- Invite code untuk undang anggota
- Setiap team punya data terpisah (chat, notes)
- Role-based access (owner, admin, member)

### 💬 Realtime Team Chat
- Channel/room per team
- Kirim pesan teks + emoji picker
- Upload file (gambar, dokumen) → Supabase Storage
- Realtime messages via Supabase subscription
- Modern chat UI (avatar, timestamp, grouped messages)
- Delete own messages

### 📝 Team Notes (Fitur Utama)
- **Interactive Folder Tree:**
  - Hierarki folder & note (nested unlimited)
  - Create folder/note, rename, delete
  - Drag & drop untuk move antar folder (dnd-kit)
  - Collapse/expand folders
  - Search/filter notes
  - Gaya mirip VS Code + Notion
- **Rich Text Editor (Tiptap):**
  - Heading (H1, H2, H3)
  - Bold, italic, strikethrough, inline code
  - Highlight, bullet list, numbered list
  - Blockquote, code block, horizontal rule
  - Undo/redo
- **Realtime collaborative editing:**
  - Auto-save (debounced)
  - Realtime sync jika user lain mengedit note yang sama
  - Notes disimpan sebagai JSON (Tiptap output)

### 📊 Dashboard
- Overview dengan statistik tim
- Recent activity feed
- Daftar team members
- Invite code display

### 🎨 UI/UX
- Dark mode (default)
- Glassmorphism effects
- Smooth animations & transitions
- Responsive layout
- Custom scrollbar
- Toast notifications (Sonner)
- Loading states & error handling

---

## 📦 Setup & Installation

### Prerequisites
- Node.js 18+
- npm
- Supabase account ([supabase.com](https://supabase.com))

### 1. Clone & Install

```bash
cd d:\Ril\WebApp\Pusdalops
npm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard)
2. Buka **SQL Editor**
3. Copy & paste isi file `supabase/migration.sql` ke SQL Editor
4. Klik **Run** untuk membuat semua tabel, indexes, RLS policies, dan triggers

### 3. Configure Environment

Buat file `.env` di root project:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> Dapatkan URL dan Anon Key dari Supabase Dashboard → Settings → API

### 4. Enable Supabase Features

Di Supabase Dashboard:
- **Authentication**: Pastikan Email auth sudah aktif
- **Storage**: Bucket `chat-files` sudah dibuat oleh migration
- **Realtime**: Sudah di-enable oleh migration

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173)

---

## 🗄️ Database Schema

### Tables
| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `teams` | Teams/workspaces |
| `team_members` | Team membership with roles |
| `channels` | Chat channels per team |
| `messages` | Chat messages |
| `folders` | Hierarchical folder tree |
| `notes` | Rich text notes (JSON content) |
| `message_reads` | Read receipts |
| `activities` | Activity log for dashboard |

### Key Features
- **UUID primary keys** di semua tabel
- **`parent_id`** di folders untuk unlimited nesting
- **`content JSONB`** di notes untuk Tiptap output
- **Row Level Security** di semua tabel
- **Realtime publication** untuk messages, notes, folders, channels
- **Auto-updated timestamps** via triggers

---

## 📁 Project Structure

```
src/
├── App.tsx                    # Root app with auth gate & navigation
├── main.tsx                   # Entry point with providers
├── index.css                  # Global styles & Tailwind theme
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── utils.ts              # Utility functions
├── types/
│   └── database.ts           # TypeScript types for DB
├── stores/
│   ├── auth-store.ts         # Auth state (Zustand)
│   ├── team-store.ts         # Team state
│   └── notes-store.ts        # Notes state
├── hooks/
│   ├── use-auth.ts           # Auth hook
│   ├── use-teams.ts          # Teams CRUD
│   ├── use-chat.ts           # Channels & messages
│   └── use-notes.ts          # Folders & notes
├── components/
│   ├── ui/                   # shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── scroll-area.tsx
│   │   ├── tooltip.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   ├── card.tsx
│   │   └── tabs.tsx
│   ├── layout/
│   │   └── sidebar.tsx       # Main sidebar navigation
│   └── notes/
│       ├── folder-tree.tsx   # DnD folder tree container
│       ├── folder-tree-node.tsx # Individual tree node
│       └── note-editor.tsx   # Tiptap rich text editor
├── features/
│   ├── dashboard/
│   │   └── dashboard-view.tsx
│   ├── chat/
│   │   └── chat-view.tsx
│   └── notes/
│       └── notes-view.tsx
└── routes/
    └── auth.tsx              # Login/Register page
```

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🔒 Security (RLS Policies)

Semua tabel dilindungi Row Level Security:
- **Profiles**: Viewable by authenticated, editable by owner
- **Teams**: Only visible to members
- **Channels/Messages**: Only accessible by team members
- **Folders/Notes**: Only accessible by team members
- **Storage**: Upload oleh authenticated users, view oleh authenticated

---

## 📄 License

MIT

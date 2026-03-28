import { useRef, useState } from 'react'
import { Loader2, Mail, Upload, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useProfileSettings } from '@/hooks/use-profile'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface ProfileSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const { profile } = useProfileSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your public identity, avatar, and chat preferences.
          </DialogDescription>
        </DialogHeader>
        {open && profile ? (
          <ProfileSettingsForm
            key={profile.updated_at}
            profile={profile}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface ProfileSettingsFormProps {
  profile: Profile
  onClose: () => void
}

function ProfileSettingsForm({ profile, onClose }: ProfileSettingsFormProps) {
  const { saveProfileMutation, uploadAvatarMutation } = useProfileSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [username, setUsername] = useState(profile.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [allowAnonChat, setAllowAnonChat] = useState(profile.allow_anon_chat ?? false)

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const uploadedUrl = await uploadAvatarMutation.mutateAsync(file)
    setAvatarUrl(uploadedUrl)
    event.target.value = ''
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await saveProfileMutation.mutateAsync({
      fullName,
      username,
      avatarUrl,
      allowAnonChat,
    })

    onClose()
  }

  const isSaving = saveProfileMutation.isPending
  const isUploading = uploadAvatarMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start gap-4 rounded-2xl border border-border/50 bg-card/40 p-4">
        <Avatar className="h-16 w-16 border border-border/50 shadow-sm">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-lg">
            {getInitials(fullName || profile.full_name || 'U')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="avatar-url">Avatar URL</Label>
            <Input
              id="avatar-url"
              placeholder="https://example.com/avatar.png"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Avatar
            </Button>
            {avatarUrl && (
              <Button type="button" variant="ghost" onClick={() => setAvatarUrl('')}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="profile-full-name">Full Name</Label>
          <Input
            id="profile-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-username">Username</Label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="profile-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username"
              className="pl-9"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={24}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used by other people to find you in chat.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="profile-email"
              value={profile.email ?? ''}
              className="pl-9"
              disabled
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Email stays managed by authentication.
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/50 bg-card/40 p-4">
        <div className="space-y-1">
          <Label htmlFor="allow-anon-chat" className="text-sm font-medium">
            Allow Anonymous Chat
          </Label>
          <p className="text-sm text-muted-foreground">
            Let people discover and message you by username.
          </p>
        </div>
        <Switch
          id="allow-anon-chat"
          checked={allowAnonChat}
          onCheckedChange={setAllowAnonChat}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || isUploading}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  )
}

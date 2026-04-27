import { useRef, useState } from 'react'
import { Loader2, Mail, Upload, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
        ) : open ? (
          <ProfileSettingsSkeleton />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-2xl border border-border/50 bg-card/40 p-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/50 bg-card/40 p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>

      <DialogFooter>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </DialogFooter>
    </div>
  )
}

interface ProfileSettingsFormProps {
  profile: Profile
  onClose: () => void
}

const OPENAI_MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'] as const
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-flash-lite-latest'] as const

function sanitizeAiModel(provider: string, model: string) {
  if (provider === 'openai') {
    return (OPENAI_MODELS as readonly string[]).includes(model) ? model : 'gpt-5'
  }
  if (provider === 'gemini') {
    return (GEMINI_MODELS as readonly string[]).includes(model) ? model : 'gemini-2.5-pro'
  }
  return ''
}

function ProfileSettingsForm({ profile, onClose }: ProfileSettingsFormProps) {
  const { saveProfileMutation, uploadAvatarMutation } = useProfileSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [username, setUsername] = useState(profile.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [allowAnonChat, setAllowAnonChat] = useState(profile.allow_anon_chat ?? false)
  const [aiServiceProvider, setAiServiceProvider] = useState(profile.ai_service_provider ?? '')
  const [aiApiKey, setAiApiKey] = useState(profile.ai_api_key ?? '')
  const [aiModel, setAiModel] = useState(() =>
    sanitizeAiModel(profile.ai_service_provider ?? '', profile.ai_model ?? '')
  )
  const [aiCustomInstructions, setAiCustomInstructions] = useState(profile.ai_custom_instructions ?? '')
  const [aiLanguage, setAiLanguage] = useState(profile.ai_language ?? '')

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
      aiServiceProvider: aiServiceProvider || null,
      aiApiKey: aiApiKey || null,
      aiModel: aiModel || null,
      aiCustomInstructions: aiCustomInstructions || null,
      aiLanguage: aiLanguage || null,
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

      <div className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-4">
        <h3 className="font-medium">AI Settings</h3>
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="space-y-2">
            <Label htmlFor="ai-service-provider">AI Provider</Label>
            <Select value={aiServiceProvider} onValueChange={(value) => {
              setAiServiceProvider(value)
              if (value === 'openai') setAiModel('gpt-5')
              else if (value === 'gemini') setAiModel('gemini-2.5-pro')
            }}>
              <SelectTrigger id="ai-service-provider" className="w-full [&>span]:truncate [&>span]:text-left">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2  ">
            <Label htmlFor="ai-model">Model</Label>
            {aiServiceProvider ? (
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger id="ai-model" className="w-full [&>span]:truncate [&>span]:text-left">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {aiServiceProvider === 'openai' ? (
                    <>
                      <SelectItem value="gpt-5">GPT-5 (Recommended)</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Recommended)</SelectItem>
                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                      <SelectItem value="gemini-flash-lite-latest">Gemini Flash Lite Latest</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-muted-foreground italic">
                Select a provider first
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-language">Language</Label>
          <Select value={aiLanguage} onValueChange={setAiLanguage}>
            <SelectTrigger id="ai-language">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="indonesian">Indonesian</SelectItem>
              <SelectItem value="javanese">Javanese</SelectItem>
              <SelectItem value="sundanese">Sundanese</SelectItem>
              <SelectItem value="arabic">Arabic</SelectItem>
              <SelectItem value="chinese">Chinese</SelectItem>
              <SelectItem value="french">French</SelectItem>
              <SelectItem value="german">German</SelectItem>
              <SelectItem value="hindi">Hindi</SelectItem>
              <SelectItem value="japanese">Japanese</SelectItem>
              <SelectItem value="korean">Korean</SelectItem>
              <SelectItem value="portuguese">Portuguese</SelectItem>
              <SelectItem value="russian">Russian</SelectItem>
              <SelectItem value="spanish">Spanish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-custom-instructions">Custom Instructions</Label>
          <Textarea
            id="ai-custom-instructions"
            value={aiCustomInstructions}
            onChange={(event) => setAiCustomInstructions(event.target.value)}
            placeholder="e.g., Use a formal tone, summarize in bullet points."
            className="h-24"
          />
          <p className="text-xs text-muted-foreground">
            Instructions that deviate from tidying up text will be ignored.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-api-key">
            {aiServiceProvider ? `${aiServiceProvider.charAt(0).toUpperCase() + aiServiceProvider.slice(1)} API Key` : 'API Key'}
          </Label>
          <Input
            id="ai-api-key"
            type="password"
            value={aiApiKey}
            onChange={(event) => setAiApiKey(event.target.value)}
            placeholder="Your API key"
          />
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

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { neatifyTextWithAi } from '@/lib/ai'
import { toast } from 'sonner'
import type { Editor } from '@tiptap/react'

interface AiToolbarButtonProps {
  editor: Editor | null
}

export function AiToolbarButton({ editor }: AiToolbarButtonProps) {
  const { profile } = useAuth()
  const [isRunning, setIsRunning] = useState(false)

  const neatifyNote = async () => {
    if (!editor || isRunning) return

    if (!profile?.ai_service_provider || !profile?.ai_api_key || !profile?.ai_model) {
      toast.error('AI settings are not configured. Please configure them in your profile settings.')
      return
    }

    const currentContent = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
    if (!currentContent.trim()) {
      toast.info('There is no content to neatify.')
      return
    }

    try {
      setIsRunning(true)
      const neatifiedContent = await neatifyTextWithAi(
        profile.ai_service_provider,
        profile.ai_api_key,
        profile.ai_model,
        currentContent,
        profile.ai_custom_instructions,
        profile.ai_language
      )
      editor.commands.setContent(neatifiedContent)
      toast.success('Note neatified successfully!')
    } catch (error) {
      console.error('Error neatifying note:', error)
      toast.error('Failed to neatify the note.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={neatifyNote}
          disabled={!editor || isRunning}
        >
          <Wand2 className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Beautify</TooltipContent>
    </Tooltip>
  )
}

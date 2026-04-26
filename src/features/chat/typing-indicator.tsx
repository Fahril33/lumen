/**
 * TypingIndicator – Animated "typing..." bubble (WhatsApp-style).
 *
 * Shows bouncing dots when someone in the chat is typing.
 */
import type { CSSProperties } from 'react'

interface TypingIndicatorProps {
  /** List of user names currently typing */
  typingUsers: { user_id: string; full_name: string }[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].full_name} is typing`
      : typingUsers.length === 2
        ? `${typingUsers[0].full_name} and ${typingUsers[1].full_name} are typing`
        : `${typingUsers[0].full_name} and ${typingUsers.length - 1} others are typing`

  return (
    <div className="flex items-end gap-2 mt-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border/50 rounded-2xl rounded-bl-sm shadow-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-[7px] h-[7px] rounded-full bg-muted-foreground/60"
              style={{
                animation: 'typing-bounce 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground mb-0.5">{label}</span>

      {/* Inline keyframe for the bounce */}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

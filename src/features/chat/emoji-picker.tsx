import EmojiPickerReact, { EmojiStyle, Theme } from 'emoji-picker-react'
import { useTheme } from '@/hooks/use-theme'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose?: () => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const { theme } = useTheme()
  const pickerTheme = theme === 'dark' ? Theme.DARK : Theme.LIGHT

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200 shadow-2xl rounded-2xl overflow-hidden border border-border/50 relative">
      <style>{`
        /* Telegram-style overrides for emoji-picker-react */
        .EmojiPickerReact {
          --epr-header-padding: 8px 12px;
          --epr-category-label-height: 32px;
          --epr-category-navigation-button-size: 28px;
        }
        .EmojiPickerReact .epr-category-name {
          font-size: 11px !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--epr-category-label-text-color);
          opacity: 0.7;
          padding: 4px 12px !important;
          display: flex;
          align-items: center;
          height: 32px !important;
        }
        .EmojiPickerReact .epr-body::-webkit-scrollbar {
          width: 4px;
        }
        .EmojiPickerReact .epr-body::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .EmojiPickerReact .epr-body::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
        }
        /* Remove extra padding from category list as requested */
        .EmojiPickerReact .epr-emoji-category {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
      `}</style>
      <EmojiPickerReact
        onEmojiClick={(emojiData) => {
          onSelect(emojiData.emoji)
        }}
        emojiStyle={EmojiStyle.APPLE}
        theme={pickerTheme}
        lazyLoadEmojis={true}
        searchDisabled={false}
        skinTonesDisabled={true}
        height={400}
        width={320}
        suggestedEmojisMode={undefined}
        searchPlaceholder="Search emojis..."
        previewConfig={{
          showPreview: false,
        }}
      />
    </div>
  )
}

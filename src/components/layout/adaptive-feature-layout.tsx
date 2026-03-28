import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'

interface AdaptiveFeatureLayoutProps {
  secondary: ReactNode
  detail: ReactNode
  showDetail: boolean
  onBack: () => void
  detailTitle?: string
  compactDetailHeader?: ReactNode
  secondaryWidthClassName?: string
  secondaryClassName?: string
  detailClassName?: string
}

export function AdaptiveFeatureLayout({
  secondary,
  detail,
  showDetail,
  onBack,
  detailTitle,
  compactDetailHeader,
  secondaryWidthClassName = 'w-80',
  secondaryClassName,
  detailClassName,
}: AdaptiveFeatureLayoutProps) {
  const { isDesktop } = useResponsiveLayout()

  if (isDesktop) {
    return (
      <div className="flex-1 flex h-full overflow-hidden">
        <div className={cn('shrink-0 border-r border-border bg-card/30', secondaryWidthClassName, secondaryClassName)}>
          {secondary}
        </div>
        <div className={cn('flex-1 min-w-0', detailClassName)}>{detail}</div>
      </div>
    )
  }

  if (showDetail) {
    return (
      <div className={cn('flex-1 flex min-w-0 flex-col overflow-hidden', detailClassName)}>
        {compactDetailHeader ?? (
          <div className="flex h-14 items-center gap-2 border-b border-border bg-card/50 px-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{detailTitle ?? 'Detail'}</p>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0">{detail}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex-1 min-w-0 overflow-hidden', secondaryClassName)}>
      {secondary}
    </div>
  )
}

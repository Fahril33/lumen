import './loader.css'

interface LoaderProps {
  className?: string
  size?: number | string
}

export function Loader({ className, size = '6em' }: LoaderProps) {
  return (
    <svg 
      viewBox="0 0 240 240" 
      height="240" 
      width="240" 
      className={`pl ${className}`}
      style={{ width: size, height: size }}
    >
      <circle 
        strokeLinecap="round" 
        strokeDashoffset="-330" 
        strokeDasharray="0 660" 
        strokeWidth="20" 
        fill="none" 
        r="105" 
        cy="120" 
        cx="120" 
        className="pl__ring pl__ring--a"
      />
      <circle 
        strokeLinecap="round" 
        strokeDashoffset="-110" 
        strokeDasharray="0 220" 
        strokeWidth="20" 
        fill="none" 
        r="35" 
        cy="120" 
        cx="120" 
        className="pl__ring pl__ring--b"
      />
      <circle 
        strokeLinecap="round" 
        strokeDasharray="0 440" 
        strokeWidth="20" 
        fill="none" 
        r="70" 
        cy="120" 
        cx="85" 
        className="pl__ring pl__ring--c"
      />
      <circle 
        strokeLinecap="round" 
        strokeDasharray="0 440" 
        strokeWidth="20" 
        fill="none" 
        r="70" 
        cy="120" 
        cx="155" 
        className="pl__ring pl__ring--d"
      />
    </svg>
  )
}

export function FullPageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="h-[var(--app-height)] w-full flex flex-col items-center justify-center bg-background gap-8">
      <Loader size="8em" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-widest uppercase">
        {label}
      </p>
    </div>
  )
}

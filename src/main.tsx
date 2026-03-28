import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'oklch(0.17 0.005 285)',
              border: '1px solid oklch(0.25 0.01 280)',
              color: 'oklch(0.985 0 0)',
            },
          }}
          richColors
        />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
)

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Zap, Shield, Users } from 'lucide-react'

export function AuthPage() {
  const { signIn, signUp, signInWithMagicLink } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')

  // Magic Link
  const [magicEmail, setMagicEmail] = useState('')

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signIn(loginEmail, loginPassword)
    if (error) toast.error(error.message)
    setIsLoading(false)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signUp(regEmail, regPassword, regName)
    if (error) toast.error(error.message)
    else toast.success('Account created! Check your email for verification.')
    setIsLoading(false)
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signInWithMagicLink(magicEmail)
    if (error) toast.error(error.message)
    else toast.success('Magic link sent! Check your email.')
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-chart-4/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-chart-2/5 rounded-full blur-[200px]" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary via-chart-4 to-chart-2 bg-clip-text text-transparent">
            Pusdalops-IT
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Platform Kolaborasi Tim IT
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
                <TabsTrigger value="magic">Magic Link</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input id="reg-name" placeholder="Your name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" placeholder="you@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" placeholder="Min 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input id="magic-email" type="email" placeholder="you@email.com" value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Magic Link'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    We'll send a login link to your email
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            <span>Secure Auth</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Users className="w-4 h-4 text-chart-2" />
            <span>Team Collab</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Zap className="w-4 h-4 text-chart-4" />
            <span>Realtime</span>
          </div>
        </div>
      </div>
    </div>
  )
}

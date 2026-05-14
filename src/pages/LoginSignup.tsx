import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';
import ProofDeskLogo from '@/components/common/ProofDeskLogo';

const LoginSignup: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!loginEmail.includes('@')) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }
    if (loginPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (signInError) {
      setError(signInError.message || 'Login failed. Please try again.');
      return;
    }

    navigate('/');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!signupEmail.includes('@')) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    const { data, error: signUpError } = await signUp(signupEmail, signupPassword);
    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Signup failed. Please try again.');
      return;
    }

    // Check if user is auto-logged in (email verification OFF)
    const isAuthed = !!data?.session;

    if (!isAuthed) {
      setSuccess('Registration successful! Please check your email to verify your account.');
      // Keep them on the page to see the message
      return;
    }

    // Send welcome email via edge function
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          email_type: 'welcome',
          to: signupEmail,
          name: signupEmail.split('@')[0],
        },
      });
    } catch {
      // Non-blocking: don't fail signup if email fails
    }

    setIsLoading(false);
    // After signup, redirect to profile completion
    navigate('/profile');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <PageMeta
        title="Login"
        description="Sign in or create your ProofDesk AI account to convert unstructured documents into actionable task lists with deadlines and AI-generated draft replies."
        canonical="https://proofdesk.ai/login"
      />
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <ProofDeskLogo size="lg" />
        </div>

        <Card className="border border-border shadow-none">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-lg font-medium text-balance">Welcome to ProofDesk</CardTitle>
            <CardDescription className="text-pretty">
              Convert unstructured documents into actionable task lists with deadlines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted">
                <TabsTrigger value="login" className="text-sm">Login</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-4 border border-destructive/20 bg-destructive/5">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 border-primary/20 bg-primary/5 text-primary">
                  <AlertDescription className="text-sm">{success}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-normal">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-10 px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-normal">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="h-10 px-3"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-10">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Log In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-normal">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="h-10 px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-normal">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="h-10 px-3"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-10">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginSignup;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkSupabaseConnection } from '@/db/supabase';
import { validateEmail, validatePassword, isLoginLocked } from '@/lib/auth-security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Info, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';
import ProofDeskLogo from '@/components/common/ProofDeskLogo';

type AuthView = 'auth' | 'forgot' | 'reset-sent' | 'otp';

const strengthColors: Record<string, string> = {
  weak: 'bg-destructive',
  fair: 'bg-yellow-500',
  strong: 'bg-emerald-500',
  very_strong: 'bg-emerald-600',
};

const strengthLabels: Record<string, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  very_strong: 'Very Strong',
};

const strengthValues: Record<string, number> = {
  weak: 15,
  fair: 40,
  strong: 70,
  very_strong: 100,
};

const LoginSignup: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState<AuthView>('auth');
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup fields
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof validatePassword> | null>(null);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
    // Handle password reset redirect
    if (searchParams.get('reset') === 'true') {
      setSuccess('Password reset link detected. You can now update your password in Security Settings after logging in.');
    }
  }, [location.state, searchParams]);

  // Live password strength indicator
  useEffect(() => {
    if (signupPassword.length > 0) {
      setPasswordStrength(validatePassword(signupPassword));
    } else {
      setPasswordStrength(null);
    }
  }, [signupPassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check lockout
    const lockCheck = isLoginLocked();
    if (lockCheck.locked) {
      setError(`Too many failed attempts. Try again in ${lockCheck.lockoutMinutes} minutes.`);
      return;
    }

    setIsLoading(true);

    // Validate connection
    const connCheck = await checkSupabaseConnection();
    if (!connCheck.ok) {
      setError(`Connection error: ${connCheck.error || 'Cannot connect to database'}`);
      setIsLoading(false);
      return;
    }

    const emailCheck = validateEmail(loginEmail);
    if (!emailCheck.valid) {
      setError(emailCheck.error || 'Invalid email.');
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

    // Validate connection
    const connCheck = await checkSupabaseConnection();
    if (!connCheck.ok) {
      setError(`Connection error: ${connCheck.error || 'Cannot connect to database'}`);
      setIsLoading(false);
      return;
    }

    const emailCheck = validateEmail(signupEmail);
    if (!emailCheck.valid) {
      setError(emailCheck.error || 'Invalid email.');
      setIsLoading(false);
      return;
    }

    const pwCheck = validatePassword(signupPassword);
    if (!pwCheck.valid) {
      setError(pwCheck.errors[0]);
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
    const isAuthed = !!(data as { session?: unknown })?.session;

    if (!isAuthed) {
      setSuccess('Registration successful! Please check your email to verify your account.');
      return;
    }

    // After signup, redirect to profile completion
    navigate('/profile');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const emailCheck = validateEmail(forgotEmail);
    if (!emailCheck.valid) {
      setError(emailCheck.error || 'Invalid email.');
      setIsLoading(false);
      return;
    }

    const { error: resetError } = await resetPassword(forgotEmail);
    setIsLoading(false);

    if (resetError) {
      setError(resetError.message || 'Failed to send reset email.');
      return;
    }

    setView('reset-sent');
  };

  // Forgot Password View
  if (view === 'forgot') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <PageMeta title="Reset Password" description="Reset your ProofDesk AI account password." />
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center">
            <ProofDeskLogo size="lg" />
          </div>
          <Card className="border border-border shadow-none">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-lg font-medium text-balance">Reset Password</CardTitle>
              <CardDescription className="text-pretty">
                Enter your email address and we'll send you a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4 border border-destructive/20 bg-destructive/5">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-normal">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="h-10 px-3"
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-10">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
              </form>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4 gap-2 text-muted-foreground"
                onClick={() => { setView('auth'); setError(''); }}
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset Sent Confirmation View
  if (view === 'reset-sent') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <PageMeta title="Check Your Email" description="Password reset email sent." />
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center">
            <ProofDeskLogo size="lg" />
          </div>
          <Card className="border border-border shadow-none">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2 text-balance">Check Your Email</h2>
              <p className="text-sm text-muted-foreground mb-6 text-pretty">
                We've sent a password reset link to <strong>{forgotEmail}</strong>. 
                Please check your inbox and follow the instructions.
              </p>
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => { setView('auth'); setError(''); setSuccess(''); }}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Auth View (Login / Signup)
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
            <Alert className="mb-6 border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold uppercase tracking-wider mb-1">Access Restriction</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed">
                Public registration is currently limited to <strong>authorized users</strong> to preserve AI processing credits. 
                If you require access, please contact the administrator.
              </AlertDescription>
            </Alert>
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
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-normal">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-10 px-3 pr-10"
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-10">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Log In
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                  >
                    Forgot your password?
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
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-normal">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        className="h-10 px-3 pr-10"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {/* Password Strength Indicator */}
                    {passwordStrength && (
                      <div className="space-y-1.5 pt-1">
                        <Progress
                          value={strengthValues[passwordStrength.strength]}
                          className="h-1.5"
                          // @ts-expect-error -- custom indicator styling
                          indicatorClassName={strengthColors[passwordStrength.strength]}
                        />
                        <p className={`text-xs font-medium ${
                          passwordStrength.strength === 'weak' ? 'text-destructive' :
                          passwordStrength.strength === 'fair' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {strengthLabels[passwordStrength.strength]}
                          {!passwordStrength.valid && passwordStrength.errors.length > 0 && (
                            <span className="font-normal text-muted-foreground"> — {passwordStrength.errors[0]}</span>
                          )}
                        </p>
                      </div>
                    )}
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

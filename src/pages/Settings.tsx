import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import PageMeta from '@/components/common/PageMeta';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { validatePassword } from '@/lib/auth-security';
import { Loader2, ShieldCheck, AlertTriangle, Eye, EyeOff, KeyRound, Shield, Activity } from 'lucide-react';
import { toast } from 'sonner';

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

const Settings: React.FC = () => {
  const { updatePassword, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof validatePassword> | null>(null);

  useEffect(() => {
    if (newPassword.length > 0) {
      setPasswordStrength(validatePassword(newPassword));
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      setError(pwCheck.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await updatePassword(newPassword);
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      toast.error('Failed to update password');
    } else {
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <AppLayout>
      <PageMeta
        title="Security Settings"
        description="Manage your account security and update your password."
        noindex
      />
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Security Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Protect your account and manage your credentials.</p>
        </div>

        <div className="grid gap-6">
          {/* Account Info */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{user?.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Status</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Change Password</CardTitle>
                  <CardDescription className="text-xs">Update your account password to stay secure.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                {error && (
                  <Alert variant="destructive" className="border border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-normal">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
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
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-normal">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="h-10 px-3"
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="h-10 px-8">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-destructive">Danger Zone</CardTitle>
              <CardDescription className="text-xs">Actions that are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all data.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => toast.info('Account deletion is disabled for the hackathon.')}>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;

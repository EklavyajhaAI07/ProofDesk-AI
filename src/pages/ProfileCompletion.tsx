import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';
import ProofDeskLogo from '@/components/common/ProofDeskLogo';

const ProfileCompletion: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [work, setWork] = useState('');
  const [organization, setOrganization] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !dateOfBirth || !work.trim() || !organization.trim()) {
      setError('All fields are required.');
      return;
    }

    setIsLoading(true);

    // Ensure profile exists first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user!.id)
      .maybeSingle();

    if (!existingProfile) {
      // Create profile row
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user!.id,
        email: user!.email!,
        name: name.trim(),
        date_of_birth: dateOfBirth,
        work: work.trim(),
        organization: organization.trim(),
        profile_completed: true,
      });

      if (insertError) {
        setError(insertError.message || 'Failed to save profile.');
        setIsLoading(false);
        return;
      }
    } else {
      const { error: updateError } = await supabase.from('profiles').update({
        name: name.trim(),
        date_of_birth: dateOfBirth,
        work: work.trim(),
        organization: organization.trim(),
        profile_completed: true,
      }).eq('id', user!.id);

      if (updateError) {
        setError(updateError.message || 'Failed to update profile.');
        setIsLoading(false);
        return;
      }
    }

    await refreshProfile();
    setIsLoading(false);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <PageMeta
        title="Complete Your Profile"
        description="Complete your ProofDesk AI profile to start processing documents and extracting actionable tasks."
        noindex
      />
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4">
          <ProofDeskLogo size="lg" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Complete Your Profile</h1>
        </div>

        <Card className="border border-border shadow-none">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-lg font-medium text-balance">Profile Details</CardTitle>
            <CardDescription className="text-pretty">
              Please fill in all fields to access ProofDesk features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 border border-destructive/20 bg-destructive/5">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-normal">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-10 px-3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob" className="text-sm font-normal">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  className="h-10 px-3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work" className="text-sm font-normal">Work / Profession</Label>
                <Input
                  id="work"
                  type="text"
                  placeholder="Software Engineer"
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  required
                  className="h-10 px-3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization" className="text-sm font-normal">Organization</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Acme Corp"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                  className="h-10 px-3"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-10 mt-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Complete Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileCompletion;

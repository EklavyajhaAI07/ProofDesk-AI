import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import PageMeta from '@/components/common/PageMeta';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Plus,
  Trash2,
  Search,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Mail,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface AllowedUser {
  email: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  const fetchAllowedUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('allowed_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load allowed users');
    } else {
      setAllowedUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllowedUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsAdding(true);
    const { error } = await supabase
      .from('allowed_users')
      .insert({ email: newEmail.trim().toLowerCase(), added_by: user?.id });

    if (error) {
      toast.error(error.message || 'Failed to add user');
    } else {
      toast.success(`${newEmail} added to allowed list`);
      setNewEmail('');
      fetchAllowedUsers();
    }
    setIsAdding(false);
  };

  const handleDeleteUser = async (email: string) => {
    setDeletingEmail(email);
    const { error } = await supabase
      .from('allowed_users')
      .delete()
      .eq('email', email);

    if (error) {
      toast.error(error.message || 'Failed to remove user');
    } else {
      toast.success('User removed from allowed list');
      setAllowedUsers(prev => prev.filter(u => u.email !== email));
    }
    setDeletingEmail(null);
  };

  const filteredUsers = useMemo(() => {
    return allowedUsers.filter(u => 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allowedUsers, searchQuery]);

  return (
    <AppLayout>
      <PageMeta title="Admin Dashboard" description="Manage allowed users for ProofDesk AI." noindex />
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage access control and authorized users.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add User Card */}
          <Card className="lg:col-span-1 border border-border shadow-none h-fit sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Authorize User
              </CardTitle>
              <CardDescription className="text-xs">
                Add an email to the allowed list to permit sign-up and login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-normal">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="h-10 px-3"
                  />
                </div>
                <Button type="submit" disabled={isAdding} className="w-full h-10">
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add User
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List Card */}
          <Card className="lg:col-span-2 border border-border shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Allowed Users
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {allowedUsers.length} users authorized
                  </CardDescription>
                </div>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center border border-dashed rounded-lg">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No authorized users found.</p>
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-xs">User Email</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Date Added</TableHead>
                        <TableHead className="text-xs text-right w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.email} className="group">
                          <TableCell className="text-sm py-3">
                            <div className="font-medium">{user.email}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.email !== 'eklavya2227@gmail.com' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteUser(user.email)}
                                disabled={deletingEmail === user.email}
                              >
                                {deletingEmail === user.email ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tighter">Root</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Stats Section (Placeholder) */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border shadow-none bg-muted/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Total Tasks</p>
              <p className="text-2xl font-semibold">—</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-none bg-muted/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">AI Generations</p>
              <p className="text-2xl font-semibold">—</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-none bg-muted/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Documents</p>
              <p className="text-2xl font-semibold">—</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-none bg-muted/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Storage Use</p>
              <p className="text-2xl font-semibold">—</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;

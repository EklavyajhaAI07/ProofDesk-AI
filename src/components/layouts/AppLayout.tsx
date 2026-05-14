import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import ProofDeskLogo from '@/components/common/ProofDeskLogo';
import {
  History,
  Home,
  LogOut,
  Menu,
  User,
  Settings,
  Sun,
  Moon,
  Anchor
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'History', path: '/history', icon: History },
  { name: 'Security', path: '/settings', icon: Settings },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3" aria-label="ProofDesk AI Home">
            <ProofDeskLogo size="md" />
          </Link>
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

          <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 ${theme === 'light' ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setTheme('light')}
                title="Light Mode"
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 ${theme === 'dark' ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 ${theme === 'navy' ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setTheme('navy')}
                title="Indian Navy Mode"
              >
                <Anchor className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3 px-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.name || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Link to="/" className="flex items-center gap-2" aria-label="ProofDesk AI Home">
            <ProofDeskLogo size="sm" />
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6">
                  <ProofDeskLogo size="md" />
                </div>
                <nav className="flex-1 p-4 space-y-1" aria-label="Mobile navigation">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-border">
                  <p className="text-sm font-medium px-3 mb-1 truncate">{profile?.name || user?.email}</p>
                  <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

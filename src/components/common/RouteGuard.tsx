import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';

interface RouteGuardProps {
  children: React.ReactNode;
}

const SYSTEM_PUBLIC_ROUTES = ['/login', '/403', '/404'];
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);
const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    if (user && !isPublic) {
      // MASTER LOCK: Only allow this specific email
      if (user.email !== 'eklavya2227@gmail.com') {
        console.error('Unauthorized access attempt:', user.email);
        signOut();
        navigate('/login', { state: { error: 'Access Denied: Only the master administrator is allowed.' }, replace: true });
        return;
      }

      // If profile is not completed, redirect to profile page
      const isProfilePage = location.pathname === '/profile';
      if (!profile?.profile_completed && !isProfilePage) {
        navigate('/profile', { replace: true });
        return;
      }
      // If profile is completed and on profile page, redirect to dashboard
      if (profile?.profile_completed && isProfilePage) {
        navigate('/', { replace: true });
        return;
      }
    }

    // Redirect logged-in users from login page
    if (user && location.pathname === '/login') {
      if (!profile?.profile_completed) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
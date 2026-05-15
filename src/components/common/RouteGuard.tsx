import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
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
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [checkingAllowed, setCheckingAllowed] = useState(false);

  const checkAllowedUser = useCallback(async (email: string | undefined) => {
    if (!email) return false;
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      if (error) {
        console.warn('allowed_users table check error:', error.message);
        return false;
      }
      return !!data;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAllowed(null);
      setCheckingAllowed(false);
      return;
    }

    const verifyAccess = async () => {
      setCheckingAllowed(true);
      const allowed = await checkAllowedUser(user.email || undefined);
      setIsAllowed(allowed);
      setCheckingAllowed(false);
    };

    verifyAccess();
  }, [user, loading, checkAllowedUser]);

  useEffect(() => {
    if (loading || checkingAllowed) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    if (user && !isPublic) {
      if (isAllowed === false) {
        console.error('Unauthorized access attempt:', user.email);
        signOut();
        navigate('/login', { state: { error: 'Access Denied: Your email is not authorized. Please contact the administrator.' }, replace: true });
        return;
      }

      if (isAllowed === null && !isPublic) {
        return;
      }

      const isProfilePage = location.pathname === '/profile';
      if (!profile?.profile_completed && !isProfilePage) {
        navigate('/profile', { replace: true });
        return;
      }
      if (profile?.profile_completed && isProfilePage) {
        navigate('/', { replace: true });
        return;
      }
    }

    if (user && location.pathname === '/login') {
      if (!profile?.profile_completed) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, loading, checkingAllowed, isAllowed, location.pathname, navigate, signOut]);

  if (loading || checkingAllowed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
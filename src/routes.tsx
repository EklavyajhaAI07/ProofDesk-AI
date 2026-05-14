import LoginSignup from './pages/LoginSignup';
import ProfileCompletion from './pages/ProfileCompletion';
import Dashboard from './pages/Dashboard';
import Processing from './pages/Processing';
import Results from './pages/Results';
import History from './pages/History';
import Settings from './pages/Settings';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Login',
    path: '/login',
    element: <LoginSignup />,
    public: true,
  },
  {
    name: 'Profile',
    path: '/profile',
    element: <ProfileCompletion />,
  },
  {
    name: 'Dashboard',
    path: '/',
    element: <Dashboard />,
  },
  {
    name: 'Processing',
    path: '/processing',
    element: <Processing />,
  },
  {
    name: 'Results',
    path: '/results',
    element: <Results />,
  },
  {
    name: 'History',
    path: '/history',
    element: <History />,
  },
  {
    name: 'Settings',
    path: '/settings',
    element: <Settings />,
  },
];

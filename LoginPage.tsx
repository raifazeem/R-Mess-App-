import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useData, useTheme } from '../App';
import { UserRole, AnyUser } from '../types';
import { Button, Card, Input, Icons } from '../components/ui';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [detectedRole, setDetectedRole] = useState<UserRole | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const { login, user: loggedInUser } = useAuth();
  const { actions } = useData();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const user = actions.findUserByUsername(username);
    setDetectedRole(user?.role || null);
  }, [username, actions]);

  useEffect(() => {
    if (loggedInUser) {
        switch (loggedInUser.role) {
            case UserRole.ADMIN: navigate('/admin'); break;
            case UserRole.STUDENT: navigate('/student'); break;
            case UserRole.COOK: navigate('/cook'); break;
        }
    }
  }, [loggedInUser, navigate]);

  const handleLogin = () => {
    setError('');
    const user = actions.findUserByUsername(username);

    if (user && 'password' in user && user.password === password) {
      login(user as AnyUser, rememberMe);
      // Navigation is now handled by the useEffect above
    } else {
      setError('Invalid username or password.');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const getRoleIcon = (role: UserRole | null) => {
    switch (role) {
        case UserRole.ADMIN: return <Icons.Shield className="h-5 w-5 text-primary-500" />;
        case UserRole.STUDENT: return <Icons.User className="h-5 w-5 text-green-500" />;
        case UserRole.COOK: return <Icons.ChefHat className="h-5 w-5 text-orange-500" />;
        default: return <Icons.User className="h-5 w-5 text-gray-400" />;
    }
  };
  
  const appIconSrc = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyOCIgZmlsbD0iIzNCODJGNiIvPjxwYXRoIGQ9Ik0yNCA4OEMyNCA4OCAzNiA3NiA2NCA3NkM5MiA3NiAxMDQgODggMTA0IDg4Vjk2SDI0Vjg4WiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTQ0IDY0QzQ0IDY0IDQ4IDUyIDU2IDUyQzY0IDUyIDY4IDY0IDY4IDY0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNjggNjRDNjggNjQgNzIgNTIgODAgNTJDODggNTIgOTIgNjQgOTIgNjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik01NiA0MEM1NiA0MCA2MCAyOCA2OCAyOEM3NiAyOCA4MCA0MCA4MCA0MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 relative p-4">
      <div className="absolute top-4 right-4">
        <Button onClick={toggleTheme} variant="ghost" size="sm">
          {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
        </Button>
      </div>
      <div className="text-center mb-8">
        <img src={appIconSrc} alt="App Logo" className="w-20 h-20 mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">R-Mess</h1>
        <p className="text-gray-500 dark:text-gray-400">Please sign in to continue</p>
      </div>
      <Card className="w-full max-w-sm">
        <div className="space-y-6">
          <Input
            label="Username"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyPress}
            Icon={getRoleIcon(detectedRole)}
            placeholder="Enter your username"
            autoComplete="username"
          />
          
          <div className="w-full">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Icons.EyeOff className="h-5 w-5 text-gray-400" /> : <Icons.Eye className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Remember me
              </label>
            </div>
             <div className="text-sm">
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                    Create an account
                </Link>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
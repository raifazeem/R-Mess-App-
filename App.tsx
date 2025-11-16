
import React, { useState, createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AnyUser, UserRole, Admin } from './types';
import { useAppData } from './hooks/useAppData';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import StudentPage from './pages/StudentPage';
import CookPage from './pages/CookPage';
import RegistrationPage from './pages/RegistrationPage';
import { Icons, Toast } from './components/ui';

// Theme Context
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
interface AuthContextType {
  user: AnyUser | null;
  tenantId: string | null;
  isSuperAdmin: boolean;
  login: (user: AnyUser, rememberMe: boolean) => void;
  logout: () => void;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType>({ user: null, tenantId: null, isSuperAdmin: false, login: () => {}, logout: () => {}, isLoading: true });
export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AnyUser | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('loggedInUser');
            if (storedUser) {
                const userJSON = JSON.parse(storedUser);
                setUser(userJSON);
                setTenantId(userJSON.tenantId);
                setIsSuperAdmin((userJSON as Admin).isSuperAdmin || false);
            }
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem('loggedInUser');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (loggedInUser: AnyUser, rememberMe: boolean) => {
        setUser(loggedInUser);
        setTenantId(loggedInUser.tenantId);
        setIsSuperAdmin((loggedInUser as Admin).isSuperAdmin || false);
        if (rememberMe) {
            try {
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            } catch (e) {
                console.error("Failed to save user to localStorage", e);
            }
        } else {
            localStorage.removeItem('loggedInUser');
        }
    };

    const logout = () => {
        setUser(null);
        setTenantId(null);
        setIsSuperAdmin(false);
        localStorage.removeItem('loggedInUser');
    };

    const value = useMemo(() => ({ user, login, logout, isLoading, tenantId, isSuperAdmin }), [user, isLoading, tenantId, isSuperAdmin]);
    
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><Icons.Utensils className="h-16 w-16 animate-spin text-primary-500" /></div>;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


// Data Context
const DataContext = createContext<ReturnType<typeof useAppData> | null>(null);
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appData = useAppData();
  return <DataContext.Provider value={appData}>{children}</DataContext.Provider>;
};

// Toast Context
interface ToastMessage {
  id: number;
  message: string;
}
interface ToastContextType {
  addToast: (message: string) => void;
}
const ToastContext = createContext<ToastContextType | null>(null);
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};


// Protected Route Component
const ProtectedRoute: React.FC<{ allowedRoles: UserRole[] }> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
      return null;
  }
  
  if (!user) return <Navigate to="/login" />;
  return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/login" />;
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DataProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegistrationPage />} />
                <Route path="/" element={<Navigate to="/login" />} />
                
                <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={[UserRole.STUDENT]} />}>
                  <Route path="/student" element={<StudentPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={[UserRole.COOK]} />}>
                  <Route path="/cook" element={<CookPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;

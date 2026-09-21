import os

files = {}

# 1. AuthContext.tsx
files['frontend/src/context/AuthContext.tsx'] = """import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('relaywork_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('relaywork_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('relaywork_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to fetch user:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('relaywork_token', newToken);
    localStorage.setItem('relaywork_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('relaywork_token');
    localStorage.removeItem('relaywork_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
"""

# 2. ToastContext.tsx
files['frontend/src/context/ToastContext.tsx'] = """import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBg = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-lg transition-all animate-slide-in ${getBg(
              toast.type
            )}`}
          >
            <div className="flex items-center space-x-3">
              {getIcon(toast.type)}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
"""

# 3. Navbar.tsx
files['frontend/src/components/Navbar.tsx'] = """import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, Briefcase, LogOut, Search } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-primary-600 font-bold text-xl">
              <div className="bg-primary-600 text-white p-1.5 rounded-lg">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="tracking-tight text-gray-900 font-black text-2xl">
                Relay<span className="text-primary-600">Work</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/pros"
              className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition"
            >
              <Search className="w-4 h-4" />
              <span>Find Pros</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/jobs"
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>My Jobs</span>
                </Link>

                {user.role === 'pro' && (
                  <Link
                    to="/pro/onboarding"
                    className="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition"
                  >
                    Pro Profile
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-1 text-purple-700 bg-purple-50 hover:bg-purple-100 text-sm font-semibold px-3 py-1.5 rounded-lg border border-purple-200 transition"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <div className="flex items-center space-x-3 border-l pl-4 ml-2 border-gray-200">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-bold text-gray-800">{user.full_name}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
"""

# 4. MapPicker.tsx
files['frontend/src/components/MapPicker.tsx'] = """import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  initialLat: number;
  initialLng: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

const LocationMarker: React.FC<{
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onLocationSelect: (lat: number, lng: number) => void;
}> = ({ position, setPosition, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={position} />;
};

export const MapPicker: React.FC<MapPickerProps> = ({
  initialLat,
  initialLng,
  onLocationSelect,
}) => {
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-inner z-0">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={position}
          setPosition={setPosition}
          onLocationSelect={onLocationSelect}
        />
      </MapContainer>
    </div>
  );
};
"""

# 5. MapView.tsx
files['frontend/src/components/MapView.tsx'] = """import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProProfile } from '../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  center: [number, number];
  pros: ProProfile[];
  selectedPro?: ProProfile | null;
  onSelectPro?: (pro: ProProfile) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  center,
  pros,
  onSelectPro,
}) => {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={500}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.2 }}
        />
        {pros.map((pro) => (
          <Marker
            key={pro.id}
            position={[pro.latitude, pro.longitude]}
            eventHandlers={{
              click: () => onSelectPro && onSelectPro(pro),
            }}
          >
            <Popup>
              <div className="p-2 text-sm">
                <p className="font-bold text-gray-900">{pro.business_name || pro.user?.full_name}</p>
                <p className="text-primary-600 font-semibold">{pro.category?.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ₦{pro.hourly_rate?.toLocaleString()}/hr • ⭐ {pro.rating_avg.toFixed(1)}
                </p>
                {pro.distance_km !== undefined && (
                  <p className="text-xs text-emerald-600 font-medium">
                    {pro.distance_km.toFixed(1)} km away
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
"""

# 6. ChatBox.tsx
files['frontend/src/components/ChatBox.tsx'] = """import React, { useState, useEffect, useRef } from 'react';
import { jobsApi } from '../api/endpoints';
import { Message, User } from '../types';
import { Send } from 'lucide-react';

interface ChatBoxProps {
  jobId: number;
  currentUser: User;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ jobId, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await jobsApi.getMessages(jobId);
        setMessages(history);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };

    fetchHistory();

    const token = localStorage.getItem('relaywork_token');
    const wsUrl = `ws://localhost:8000/api/chat/ws/${jobId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const newMsg: Message = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [jobId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const content = input.trim();
    setInput('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(content);
    } else {
      try {
        setLoading(true);
        const sent = await jobsApi.sendMessage(jobId, content);
        setMessages((prev) => [...prev, sent]);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to send message via HTTP', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-96 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">Job Discussion & Quote Chat</h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Live
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 my-auto">
            No messages yet. Agree on a quote or clarify job details here!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id || Math.random()}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.sender?.full_name || (isMe ? 'You' : 'Other')} •{' '}
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-gray-50 border-t border-gray-200 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message or negotiate quote..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center justify-center transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
"""

# 7. App.tsx
files['frontend/src/App.tsx'] = """import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProSearch } from './pages/ProSearch';
import { ProDetails } from './pages/ProDetails';
import { ProOnboarding } from './pages/ProOnboarding';
import { MyJobs } from './pages/MyJobs';
import { JobDetails } from './pages/JobDetails';
import { AdminDashboard } from './pages/AdminDashboard';
import { BootstrapAdmin } from './pages/BootstrapAdmin';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/pros" element={<ProSearch />} />
                <Route path="/pros/:id" element={<ProDetails />} />
                
                <Route
                  path="/jobs"
                  element={
                    <ProtectedRoute>
                      <MyJobs />
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/jobs/:id"
                  element={
                    <ProtectedRoute>
                      <JobDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pro/onboarding"
                  element={
                    <ProtectedRoute allowedRoles={['pro']}>
                      <ProOnboarding />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="/admin/bootstrap" element={<BootstrapAdmin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
"""

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print('All components & App.tsx generated successfully')

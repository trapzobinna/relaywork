import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, Briefcase, LogOut, Search, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center space-x-2 text-blue-600 font-bold text-xl">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="tracking-tight text-gray-900 font-black text-xl sm:text-2xl">
                Relay<span className="text-blue-600">Work</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/pros"
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition"
            >
              <Search className="w-4 h-4" />
              <span>Find Pros</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/jobs"
                  className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>My Jobs</span>
                </Link>

                {user.role === 'pro' && (
                  <Link
                    to="/pro/onboarding"
                    className="text-gray-600 hover:text-blue-600 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition"
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
                  className="text-gray-700 hover:text-blue-600 text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <Link
            to="/pros"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            <Search className="w-5 h-5 text-gray-500" />
            <span>Find Pros</span>
          </Link>

          {user ? (
            <>
              <Link
                to="/jobs"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              >
                <Briefcase className="w-5 h-5 text-gray-500" />
                <span>My Jobs</span>
              </Link>

              {user.role === 'pro' && (
                <Link
                  to="/pro/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  <span>Pro Profile & KYC</span>
                </Link>
              )}

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2.5 rounded-lg text-base font-medium text-purple-700 bg-purple-50"
                >
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>Admin Panel</span>
                </Link>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-800 text-sm">{user.full_name}</div>
                  <div className="text-xs text-gray-500 uppercase">{user.role} &bull; {user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2 border-t border-gray-100 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

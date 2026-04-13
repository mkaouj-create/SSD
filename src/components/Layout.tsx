import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, FolderOpen, LogOut, Menu, Users, Settings, Bell, Search, Shield, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const Layout = () => {
  const { signOut, role, bureauId, hasPermission } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    if (bureauId) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('bureau_id', bureauId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setNotifications(data);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription for notifications
    if (bureauId) {
      const channel = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `bureau_id=eq.${bureauId}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [bureauId, location.pathname]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0 && bureauId) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('bureau_id', bureauId)
        .eq('read', false);
      
      if (!error) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Dossiers', href: '/dossiers', icon: FolderOpen },
    { name: 'Utilisateurs', href: '/users', icon: Users },
    { name: 'Paramètres', href: '/settings', icon: Settings },
  ];

  if (role === 'admin' || role === 'Super_admin' || hasPermission('manage_roles')) {
    navigation.splice(3, 0, { name: 'Rôles', href: '/roles', icon: Shield });
  }

  if (role === 'Super_admin') {
    navigation.splice(4, 0, { name: 'Demandes', href: '/admin-requests', icon: Users });
    navigation.splice(5, 0, { name: 'Bureaux', href: '/bureaus', icon: Building2 });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-72 md:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-100 bg-white pt-8 px-4">
          <div className="flex flex-shrink-0 items-center px-4 mb-10">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-blue-200">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter">SSD</h1>
          </div>
          <div className="flex flex-1 flex-col">
            <nav className="flex-1 space-y-2 pb-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 translate-x-1'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="border-t border-gray-100 py-6 px-2">
            <div className="mb-6 px-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rôle Actuel</div>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                <span className="font-bold text-gray-700 capitalize text-sm">{role}</span>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/';
              }}
              className="group flex w-full items-center rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow-sm border-b border-gray-100 md:hidden">
        <button
          type="button"
          className="px-4 text-gray-500 focus:outline-none md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center px-4">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tighter">SSD</h1>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col">
            <div className="flex items-center mb-10">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                <span className="text-white font-black text-xl">S</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tighter">SSD</h1>
            </div>
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                      isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <button
                onClick={async () => {
                  setIsMobileMenuOpen(false);
                  await signOut();
                  window.location.href = '/';
                }}
                className="flex w-full items-center rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-72">
        {/* Top header for desktop notifications */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 justify-end px-8 hidden md:flex">
          <div className="flex items-center relative">
            <button
              type="button"
              onClick={handleNotificationClick}
              className="relative rounded-xl bg-gray-50 p-2 text-gray-400 hover:text-blue-600 focus:outline-none transition-all"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Aucune notification</div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}>
                        <p className="text-sm text-gray-800">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.created_at).toLocaleDateString('fr-FR')} à {new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

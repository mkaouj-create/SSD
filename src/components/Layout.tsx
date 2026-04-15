import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, FolderOpen, LogOut, Menu, Users, Settings, Bell, Search, Shield, Building2, Plus, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const Layout = () => {
  const { signOut, role, bureauId, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowSearchResults(false);
    setSearchQuery('');
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const searchDossiers = async () => {
      if (!searchQuery.trim() || !bureauId) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('dossiers')
          .select('id, tracking_code, objet, expediteur, numero_enregistrement')
          .eq('bureau_id', bureauId)
          .or(`numero_enregistrement.ilike.%${searchQuery}%,objet.ilike.%${searchQuery}%,expediteur.ilike.%${searchQuery}%,tracking_code.ilike.%${searchQuery}%`)
          .limit(5);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Error searching dossiers:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchDossiers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, bureauId]);

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
    { name: 'Nouveau', href: '/dossiers/new', icon: Plus, mobileOnly: true },
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
              {navigation.filter(item => !item.mobileOnly).map((item) => {
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
      <div className="sticky top-0 z-20 flex flex-col flex-shrink-0 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-md shadow-blue-100">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tighter">SSD</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className={`p-2 focus:outline-none transition-all ${isMobileSearchOpen ? 'text-blue-600 bg-blue-50 rounded-lg' : 'text-gray-400 hover:text-blue-600'}`}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleNotificationClick}
              className="relative p-2 text-gray-400 hover:text-blue-600 focus:outline-none transition-all"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
            
            <button
              type="button"
              className="p-2 text-gray-500 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expandable */}
        {isMobileSearchOpen && (
          <div className="px-4 pb-3 pt-1 relative z-30" ref={searchRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher un dossier..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Search Results */}
            {showSearchResults && searchQuery.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-1 mx-4 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-gray-500">Recherche en cours...</div>
                ) : searchResults.length > 0 ? (
                  <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {searchResults.map((dossier) => (
                      <li key={dossier.id}>
                        <button
                          onClick={() => {
                            navigate(`/dossiers/${dossier.id}`);
                            setIsMobileSearchOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-gray-900 text-sm truncate pr-2">{dossier.objet}</span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {dossier.tracking_code}
                            </span>
                            {dossier.expediteur && (
                              <span className="truncate">• {dossier.expediteur}</span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">Aucun dossier trouvé</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-4 top-14 mt-2 w-72 origin-top-right rounded-2xl bg-white py-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-100">
            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400 font-medium italic">Aucune notification</div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                    <p className="text-xs text-gray-800 font-medium leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">
                      {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-2 pb-safe-area-inset-bottom">
        <nav className="flex items-center justify-around h-16">
          {navigation.filter(item => !['Rôles', 'Demandes', 'Bureaux'].includes(item.name)).map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter mt-1 truncate w-full text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
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
              {navigation.filter(item => !item.mobileOnly).map((item) => {
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
      <div className="flex flex-1 flex-col md:pl-72 pb-20 md:pb-0">
        {/* Top header for desktop */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 justify-between px-8 hidden md:flex">
          
          {/* Global Search Desktop */}
          <div className="flex-1 flex items-center max-w-2xl pr-8" ref={searchRef}>
            <div className="w-full relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un dossier (numéro, objet, expéditeur)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-gray-500">Recherche en cours...</div>
                  ) : searchResults.length > 0 ? (
                    <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                      {searchResults.map((dossier) => (
                        <li key={dossier.id}>
                          <button
                            onClick={() => navigate(`/dossiers/${dossier.id}`)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-gray-900 text-sm truncate pr-2">{dossier.objet}</span>
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {dossier.tracking_code}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                              {dossier.numero_enregistrement && (
                                <span>N° {dossier.numero_enregistrement}</span>
                              )}
                              {dossier.numero_enregistrement && dossier.expediteur && <span>•</span>}
                              {dossier.expediteur && (
                                <span className="truncate">{dossier.expediteur}</span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">Aucun dossier trouvé</div>
                  )}
                </div>
              )}
            </div>
          </div>

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

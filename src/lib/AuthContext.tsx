import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface AuthContextType {
  session: any | null;
  user: any | null;
  role: string | null;
  status: string | null;
  bureauId: string | null;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  status: null,
  bureauId: null,
  permissions: [],
  hasPermission: () => false,
  isLoading: true,
  login: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchUserProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Supabase getSession error:', err);
        setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setPermissions([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Normalize Super_admin role to avoid case sensitivity issues
        const normalizedRole = data.role?.toLowerCase() === 'super_admin' ? 'Super_admin' : data.role;
        const profileWithNormalizedRole = { ...data, role: normalizedRole };
        
        setUserProfile(profileWithNormalizedRole);
        await updatePermissions(normalizedRole, data.bureau_id);
      } else {
        setUserProfile(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermissions = async (roleName: string, bureauId: string | null) => {
    try {
      // Fetch permissions from the roles table
      const { data, error } = await supabase
        .from('roles')
        .select('permissions')
        .eq('name', roleName)
        .or(`bureau_id.is.null,bureau_id.eq.${bureauId}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPermissions(data.permissions || []);
      } else {
        // Fallback for default roles if table is empty or role not found
        const defaultPermissions: Record<string, string[]> = {
          'Super_admin': ['view_dossiers', 'manage_dossiers', 'manage_users', 'manage_roles', 'manage_bureau'],
          'admin': ['view_dossiers', 'manage_dossiers', 'manage_users', 'manage_roles', 'manage_bureau'],
          'agent': ['view_dossiers', 'manage_dossiers'],
          'Secrétaire': ['view_dossiers', 'manage_dossiers'],
          'Vagmeustre': ['view_dossiers'],
          'client': ['view_dossiers']
        };
        setPermissions(defaultPermissions[roleName] || []);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      setPermissions([]);
    }
  };

  const login = async (email: string, pass: string) => {
    // Add a timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Délai d'attente dépassé. Vérifiez votre connexion internet ou les paramètres de votre navigateur.")), 15000);
    });

    const loginPromise = supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

    if (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error("Erreur réseau : Impossible de joindre le serveur. Vérifiez votre connexion internet, désactivez votre bloqueur de publicités, ou réessayez plus tard.");
      }
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };
  
  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchUserProfile(session.user.id);
    }
  };

  const hasPermission = (perm: string) => {
    return permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user: userProfile, 
      role: userProfile?.role || null, 
      status: userProfile?.status || null,
      bureauId: userProfile?.bureau_id || null, 
      permissions,
      hasPermission,
      isLoading, 
      login,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

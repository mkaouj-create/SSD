import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';

export const UsersList = () => {
  const { bureauId, role, user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState({ email: '', role: 'agent', password: 'password' });

  useEffect(() => {
    fetchUsers();
  }, [bureauId, role]);

  const fetchUsers = async () => {
    if (!bureauId && role !== 'Super_admin') return;

    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*');
      
      if (role !== 'Super_admin') {
        query = query.eq('bureau_id', bureauId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error (UsersList):', error);
        throw error;
      }
      setUsers(data || []);

      // Fetch roles from the roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .or(`bureau_id.is.null,bureau_id.eq.${bureauId}`);
      
      if (!rolesError && rolesData) {
        setRoles(rolesData);
      } else {
        // Fallback if table is empty
        setRoles([
          { id: '1', name: 'admin' },
          { id: '2', name: 'agent' },
          { id: '3', name: 'Secrétaire' },
          { id: '4', name: 'Vagmeustre' },
          { id: '5', name: 'client' }
        ]);
      }

    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Creating a user in Supabase Auth from the client is usually for self-signup.
    // To create OTHER users, you'd typically use a Supabase Edge Function or an Admin API.
    // For this demo, we'll show an alert that this requires admin setup.
    alert('La création d\'utilisateurs par un administrateur nécessite une configuration Supabase Admin (Edge Functions). Pour le moment, les utilisateurs doivent s\'inscrire eux-mêmes.');
    setShowAddModal(false);
  };

  const handleDeleteUser = async () => {
    if (showDeleteModal) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', showDeleteModal);
        
        if (error) throw error;
        
        setShowDeleteModal(null);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user profile:', error);
        alert('Erreur lors de la suppression du profil.');
      }
    }
  };

  const roleColors: Record<string, string> = {
    'Super_admin': 'bg-red-100 text-red-800',
    'admin': 'bg-purple-100 text-purple-800',
    'agent': 'bg-blue-100 text-blue-800',
    'client': 'bg-gray-100 text-gray-800',
  };

  const getRoleColor = (roleName: string) => {
    return roleColors[roleName] || 'bg-indigo-100 text-indigo-800';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="sm:flex sm:items-center justify-between mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Utilisateurs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Liste des collaborateurs ayant accès à ce bureau et leurs rôles respectifs.
          </p>
        </div>
        {hasPermission('manage_users') && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              onClick={() => {
                setNewUser({ email: '', role: roles.length > 0 ? roles[0].name : 'agent', password: 'password' });
                setShowAddModal(true);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Ajouter un utilisateur
            </button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl transform transition-all">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Nouvel Utilisateur</h3>
            <form onSubmit={handleAddUser}>
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Email Professionnel</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    placeholder="email@exemple.com"
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Rôle assigné</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all appearance-none"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Mot de passe temporaire</label>
                  <input
                    type="text"
                    disabled
                    value="password"
                    className="mt-1 block w-full rounded-xl border-gray-100 bg-gray-50 shadow-sm sm:text-sm border py-3 px-4 text-gray-400 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">L'utilisateur pourra le modifier après sa première connexion.</p>
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl border border-transparent bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-md transition-all"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-center space-x-4 text-red-600 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Supprimer l'accès</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Êtes-vous certain de vouloir révoquer l'accès de cet utilisateur ? Cette action est immédiate et l'utilisateur ne pourra plus se connecter.
            </p>
            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-6 py-2.5 rounded-xl border border-transparent bg-red-600 text-sm font-bold text-white hover:bg-red-700 shadow-md transition-all"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Utilisateur</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rôle & Permissions</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                      <span className="text-sm font-bold text-gray-500">Chargement des utilisateurs...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-black text-gray-900 tracking-tight">{u.email}</div>
                          {u.id === currentUser?.id && (
                            <div className="text-[10px] text-green-600 font-black uppercase tracking-widest mt-0.5">Session actuelle</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                        {(u.role === 'admin' || u.role === 'Super_admin') && <Shield className="mr-1.5 h-3 w-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      {hasPermission('manage_users') && u.id !== currentUser?.id && (
                        <button
                          onClick={() => setShowDeleteModal(u.id)}
                          className="text-red-400 hover:text-red-600 p-2.5 rounded-xl hover:bg-red-50 transition-all"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

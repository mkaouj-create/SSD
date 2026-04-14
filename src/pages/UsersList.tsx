import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';

export const UsersList = () => {
  const { bureauId, role, user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([
    { id: '1', name: 'admin' },
    { id: '2', name: 'agent' },
    { id: '3', name: 'Secrétaire' },
    { id: '4', name: 'Vagmeustre' },
    { id: '5', name: 'client' }
  ]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'agent', password: '' });

  useEffect(() => {
    fetchUsers();
    generatePassword();
  }, [bureauId, role]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, password: pass }));
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users
      let query = supabase.from('profiles').select('*');
      if (role !== 'Super_admin' && bureauId) {
        query = query.eq('bureau_id', bureauId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);

      // Fetch roles
      let rolesQuery = supabase.from('roles').select('*');
      if (bureauId) {
        rolesQuery = rolesQuery.or(`bureau_id.is.null,bureau_id.eq.${bureauId}`);
      } else {
        rolesQuery = rolesQuery.is('bureau_id', null);
      }
      
      const { data: rolesData, error: rolesError } = await rolesQuery;
      
      if (!rolesError && rolesData && rolesData.length > 0) {
        setRoles(rolesData);
      } else {
        // Fallback if table is empty or fetch fails
        const defaultRoles = [
          { id: '1', name: 'admin' },
          { id: '2', name: 'agent' },
          { id: '3', name: 'Secrétaire' },
          { id: '4', name: 'Vagmeustre' },
          { id: '5', name: 'client' }
        ];
        setRoles(defaultRoles);
        
        // Ensure newUser.role is set to a valid role if it was empty
        setNewUser(prev => ({
          ...prev,
          role: prev.role || defaultRoles[0].name
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const defaultRoles = [
        { id: '1', name: 'admin' },
        { id: '2', name: 'agent' },
        { id: '3', name: 'Secrétaire' },
        { id: '4', name: 'Vagmeustre' },
        { id: '5', name: 'client' }
      ];
      setRoles(defaultRoles);
      setNewUser(prev => ({
        ...prev,
        role: prev.role || defaultRoles[0].name
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Creating a user in Supabase Auth from the client is usually for self-signup.
    // To create OTHER users, you'd typically use a Supabase Edge Function or an Admin API.
    // For this demo, we'll show a more professional message.
    alert(`Compte pour ${newUser.full_name} prêt à être créé.\n\nEmail: ${newUser.email}\nMot de passe: ${newUser.password}\nRôle: ${newUser.role}\n\nNote: Dans cette version de démonstration, la création directe d'utilisateurs par un administrateur nécessite une configuration Supabase Admin (Edge Functions). \n\nPour le moment, veuillez demander à l'utilisateur de s'inscrire via la page d'inscription.`);
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
                setNewUser({ 
                  email: '', 
                  full_name: '',
                  role: roles.length > 0 ? roles[0].name : 'agent', 
                  password: '' 
                });
                generatePassword();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-10 shadow-2xl transform transition-all border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Nouvel Utilisateur</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Créez un accès pour un nouveau collaborateur.</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Plus className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nom Complet</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={newUser.full_name}
                      onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                      placeholder="Jean Dupont"
                      className="block w-full rounded-2xl border-gray-200 bg-gray-50/50 pl-12 pr-4 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email Professionnel</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 flex items-center justify-center font-bold text-lg">@</div>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      placeholder="email@exemple.com"
                      className="block w-full rounded-2xl border-gray-200 bg-gray-50/50 pl-12 pr-4 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Rôle Assigné</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                        className="block w-full rounded-2xl border-gray-200 bg-gray-50/50 pl-12 pr-10 py-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all appearance-none cursor-pointer"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Mot de passe</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Définir un mot de passe"
                        className="block w-full rounded-2xl border-gray-200 bg-gray-50/50 px-4 py-4 text-sm font-mono font-bold text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(newUser.password);
                            alert('Mot de passe copié !');
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
                          title="Copier"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        </button>
                        <button 
                          type="button"
                          onClick={generatePassword}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
                          title="Régénérer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                  <span className="font-black uppercase mr-1">Note :</span> 
                  L'utilisateur recevra ses identifiants et pourra modifier son mot de passe lors de sa première connexion.
                </p>
              </div>

              <div className="mt-10 flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white text-sm font-black text-gray-500 hover:bg-gray-50 hover:border-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-4 rounded-2xl border border-transparent bg-blue-600 text-sm font-black text-white hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all transform hover:-translate-y-1 active:translate-y-0"
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
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-2xl bg-gray-100"></div>
                        <div className="ml-4 space-y-2">
                          <div className="h-4 w-32 bg-gray-100 rounded"></div>
                          <div className="h-3 w-24 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5"><div className="h-6 w-20 bg-gray-100 rounded-full"></div></td>
                    <td className="px-8 py-5 text-right"><div className="h-8 w-8 bg-gray-100 rounded-xl ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-black text-gray-900 tracking-tight">{u.full_name || 'Utilisateur sans nom'}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{u.email}</div>
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 animate-pulse flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-xl bg-gray-100"></div>
                  <div className="ml-3 space-y-2">
                    <div className="h-4 w-24 bg-gray-100 rounded"></div>
                    <div className="h-3 w-32 bg-gray-100 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
              </div>
            ))
          ) : (
            users.map((u) => (
              <div key={u.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center min-w-0">
                  <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3 min-w-0">
                    <div className="text-sm font-black text-gray-900 truncate">{u.full_name || 'Sans nom'}</div>
                    <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                    {u.role}
                  </span>
                  {hasPermission('manage_users') && u.id !== currentUser?.id && (
                    <button
                      onClick={() => setShowDeleteModal(u.id)}
                      className="text-red-400 p-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

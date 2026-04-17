import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Shield, Plus, Edit, Trash2, X, Check } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  { id: 'view_dossiers', label: 'Voir les dossiers' },
  { id: 'manage_dossiers', label: 'Gérer les dossiers (Créer/Modifier/Supprimer)' },
  { id: 'manage_users', label: 'Gérer les utilisateurs' },
  { id: 'manage_roles', label: 'Gérer les rôles' },
  { id: 'manage_bureau', label: 'Gérer le bureau' }
];

export const Roles = () => {
  const { bureauId, hasPermission } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[]
  });

  const fetchRoles = async () => {
    if (!bureauId) return;
    setLoading(true);
    try {
      // Fetch roles that are either global (bureau_id is null) or belong to this bureau
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`bureau_id.is.null,bureau_id.eq.${bureauId}`);

      if (error) {
        console.error('Supabase query error (Roles):', error);
        throw error;
      }
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [bureauId]);

  const handleOpenModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        permissions: [...role.permissions]
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        permissions: []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const handleTogglePermission = (permId: string) => {
    setFormData(prev => {
      if (prev.permissions.includes(permId)) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingRole) {
        // SYNCHRONIZATION: Update the role name in the profiles table if the name was changed
        if (editingRole.name !== formData.name) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: formData.name })
            .eq('role', editingRole.name)
            .eq('bureau_id', bureauId);
            
          if (profileError) console.error("Error updating profiles with new role name:", profileError);
        }

        const { error } = await supabase
          .from('roles')
          .update({
            name: formData.name,
            permissions: formData.permissions
          })
          .eq('id', editingRole.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([
            {
              bureau_id: bureauId,
              name: formData.name,
              permissions: formData.permissions
            }
          ]);
        
        if (error) throw error;
      }

      fetchRoles();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Erreur lors de l\'enregistrement du rôle');
    }
  };

  const handleDelete = async () => {
    if (showDeleteModal) {
      try {
        // Find the role name being deleted to sync with users
        const roleToDelete = roles.find(r => r.id === showDeleteModal);
        if (roleToDelete && bureauId) {
           // SYNCHRONIZATION: Reset users who had this role to 'agent'
           await supabase
            .from('profiles')
            .update({ role: 'agent' })
            .eq('role', roleToDelete.name)
            .eq('bureau_id', bureauId);
        }

        const { error } = await supabase
          .from('roles')
          .delete()
          .eq('id', showDeleteModal);
        
        if (error) throw error;
        setShowDeleteModal(null);
        fetchRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
        alert('Erreur lors de la suppression du rôle');
      }
    }
  };

  if (!hasPermission('manage_roles')) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Accès refusé</h3>
        <p className="mt-1 text-sm text-gray-500">Vous n'avez pas la permission de gérer les rôles.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="sm:flex sm:items-center justify-between mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Rôles et Permissions</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gérez les rôles personnalisés et définissez précisément les droits d'accès pour votre bureau.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nouveau Rôle
          </button>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom du rôle</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Permissions</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                      <span className="text-sm font-bold text-gray-500">Chargement des rôles...</span>
                    </div>
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-medium italic">
                    Aucun rôle personnalisé trouvé.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-gray-900 tracking-tight">
                      {role.name}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      {role.bureau_id === null ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600 border border-gray-200">
                          Système
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100">
                          Bureau
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((perm: string) => (
                          <span key={perm} className="inline-flex items-center rounded-xl bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-500 border border-gray-100">
                            {AVAILABLE_PERMISSIONS.find(p => p.id === perm)?.label || perm}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      {role.bureau_id !== null && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleOpenModal(role)}
                            className="text-blue-400 hover:text-blue-600 p-2.5 rounded-xl hover:bg-blue-50 transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(role.id)}
                            className="text-red-400 hover:text-red-600 p-2.5 rounded-xl hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nom du rôle
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all"
                    placeholder="Ex: Responsable Courrier"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Permissions accordées
                  </label>
                  <div className="space-y-2 border border-gray-100 rounded-2xl p-4 max-h-72 overflow-y-auto bg-gray-50/50">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <div key={perm.id} className="flex items-center p-2 rounded-xl hover:bg-white transition-all border border-transparent hover:border-gray-100">
                        <div className="flex h-5 items-center">
                          <input
                            id={`perm-${perm.id}`}
                            type="checkbox"
                            checked={formData.permissions.includes(perm.id)}
                            onChange={() => handleTogglePermission(perm.id)}
                            className="h-5 w-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`perm-${perm.id}`} className="font-bold text-gray-700 cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-6 py-2.5 rounded-xl border border-transparent bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-md transition-all"
                >
                  <Check className="-ml-1 mr-2 h-4 w-4" />
                  Enregistrer le rôle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl transform transition-all text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Supprimer le rôle</h3>
            <p className="text-gray-500 mb-8">
              Êtes-vous sûr de vouloir supprimer ce rôle ? Cette action est irréversible et pourrait affecter les utilisateurs qui y sont assignés.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 rounded-xl border border-transparent bg-red-600 text-sm font-bold text-white hover:bg-red-700 shadow-md transition-all"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

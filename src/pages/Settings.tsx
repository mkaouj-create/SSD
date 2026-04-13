import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Building, User, Save, Check } from 'lucide-react';

export const Settings = () => {
  const { user, role, bureauId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [bureauSettings, setBureauSettings] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [profileSettings, setProfileSettings] = useState({
    name: '',
    email: user?.email || ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setProfileSettings(prev => ({ ...prev, name: profile.full_name || '' }));
        }
      }

      if (bureauId) {
        const { data: bureau } = await supabase
          .from('bureaus')
          .select('*')
          .eq('id', bureauId)
          .single();
        
        if (bureau) {
          setBureauSettings({
            name: bureau.name || '',
            email: bureau.email || '',
            phone: bureau.phone || ''
          });
        }
      }
    };

    fetchData();
  }, [user?.id, bureauId]);

  const handleSaveBureau = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bureauId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bureaus')
        .update(bureauSettings)
        .eq('id', bureauId);
      
      if (error) throw error;
      setSuccessMsg('Paramètres du bureau mis à jour avec succès.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving bureau settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profileSettings.name })
        .eq('id', user.id);
      
      if (error) throw error;
      setSuccessMsg('Profil mis à jour avec succès.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Paramètres</h1>
        <p className="mt-2 text-sm text-gray-600">Gérez vos informations personnelles et les configurations de votre bureau.</p>
      </div>

      {successMsg && (
        <div className="mb-6 rounded-2xl bg-green-50 p-4 border border-green-100 flex items-center shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="h-5 w-5 text-green-500 mr-3" />
          <p className="text-sm font-bold text-green-800">{successMsg}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex items-center mb-8">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mr-4">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Mon Profil</h3>
                <p className="text-sm text-gray-500">Informations de votre compte utilisateur.</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Email (Lecture seule)</label>
                  <input
                    type="email"
                    disabled
                    value={profileSettings.email}
                    className="mt-1 block w-full rounded-xl border-gray-100 bg-gray-50 shadow-sm sm:text-sm border py-3 px-4 text-gray-400 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Nom complet</label>
                  <input
                    type="text"
                    value={profileSettings.name}
                    onChange={e => setProfileSettings({...profileSettings, name: e.target.value})}
                    placeholder="Votre nom"
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Rôle actuel</label>
                  <div className="mt-1 flex items-center">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 capitalize">
                      {role || 'Utilisateur'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center rounded-xl border border-transparent bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 transition-all transform hover:-translate-y-0.5"
                >
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  Mettre à jour le profil
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bureau Settings (Admin only) */}
        {(role === 'admin' || role === 'Super_admin') && (
          <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
            <div className="px-6 py-8 sm:p-10">
              <div className="flex items-center mb-8">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center mr-4">
                  <Building className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Paramètres du Bureau</h3>
                  <p className="text-sm text-gray-500">Informations visibles par tous les membres de ce bureau.</p>
                </div>
              </div>
              <form onSubmit={handleSaveBureau} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Nom du Bureau</label>
                    <input
                      type="text"
                      required
                      value={bureauSettings.name}
                      onChange={e => setBureauSettings({...bureauSettings, name: e.target.value})}
                      className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Email de contact</label>
                    <input
                      type="email"
                      value={bureauSettings.email}
                      onChange={e => setBureauSettings({...bureauSettings, email: e.target.value})}
                      placeholder="contact@bureau.com"
                      className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Téléphone</label>
                    <input
                      type="text"
                      value={bureauSettings.phone}
                      onChange={e => setBureauSettings({...bureauSettings, phone: e.target.value})}
                      placeholder="+221 ..."
                      className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-3 px-4 transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center rounded-xl border border-transparent bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 transition-all transform hover:-translate-y-0.5"
                  >
                    <Save className="-ml-1 mr-2 h-4 w-4" />
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

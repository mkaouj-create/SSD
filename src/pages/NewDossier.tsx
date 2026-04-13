import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

export const NewDossier = () => {
  const { bureauId, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tracking_code: '',
    objet: '',
    expediteur: '',
    date_arrivee: new Date().toISOString().split('T')[0],
    numero_enregistrement: '',
    numero_orientation: '',
    orientation: '',
    annotation: '',
    observation: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('dossiers')
        .insert([
          {
            bureau_id: bureauId,
            user_id: user?.id,
            statut: 'Reçu',
            ...formData
          }
        ]);

      if (error) throw error;
      navigate('/dossiers');
    } catch (error) {
      console.error('Error creating dossier:', error);
      alert('Erreur lors de la création du dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link to="/dossiers" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste des dossiers
        </Link>
      </div>

      <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
          <h1 className="text-3xl font-black tracking-tight">Nouveau Dossier</h1>
          <p className="mt-2 text-blue-100 font-medium">
            Enregistrez un nouveau dossier dans le système pour commencer son suivi.
          </p>
        </div>
        
        <div className="p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2">
              
              <div>
                <label htmlFor="tracking_code" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Code de suivi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tracking_code"
                  id="tracking_code"
                  required
                  placeholder="Ex: SSD-2026-001"
                  value={formData.tracking_code}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="date_arrivee" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Date d'arrivée <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_arrivee"
                  id="date_arrivee"
                  required
                  value={formData.date_arrivee}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="objet" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Objet du dossier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="objet"
                  id="objet"
                  required
                  placeholder="Ex: Demande de subvention annuelle"
                  value={formData.objet}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="numero_enregistrement" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Numéro d'enregistrement
                </label>
                <input
                  type="text"
                  name="numero_enregistrement"
                  id="numero_enregistrement"
                  placeholder="Ex: REG-2026-001"
                  value={formData.numero_enregistrement}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="orientation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Orientation (Service)
                </label>
                <input
                  type="text"
                  name="orientation"
                  id="orientation"
                  placeholder="Ex: Service Comptabilité"
                  value={formData.orientation}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="annotation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Annotation
                </label>
                <textarea
                  id="annotation"
                  name="annotation"
                  rows={3}
                  placeholder="Instructions ou notes particulières..."
                  value={formData.annotation}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="observation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Observation
                </label>
                <textarea
                  id="observation"
                  name="observation"
                  rows={2}
                  placeholder="Remarques complémentaires..."
                  value={formData.observation}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>
            </div>

            <div className="pt-8 flex items-center justify-end space-x-4 border-t border-gray-100">
              <Link
                to="/dossiers"
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Enregistrer le dossier
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

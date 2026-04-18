import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, X, AlertCircle } from 'lucide-react';
import { parseOrientations } from '../lib/orientationUtils';

export const EditDossier = () => {
  const { id } = useParams<{ id: string }>();
  const { bureauId, user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [originalDossier, setOriginalDossier] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState({
    type_dossier: 'Arrivée',
    objet: '',
    expediteur: '',
    numero_expediteur: '',
    date_arrivee: '',
    numero_enregistrement: '',
    numero_orientation: '',
    observation: '',
    statut: ''
  });

  const [orientationsList, setOrientationsList] = useState([
    { service: '', annotation: '' }
  ]);

  const addOrientation = () => {
    setOrientationsList([...orientationsList, { service: '', annotation: '' }]);
  };

  const updateOrientation = (index: number, field: string, value: string) => {
    const newList = [...orientationsList];
    newList[index] = { ...newList[index], [field]: value };
    setOrientationsList(newList);
  };

  const removeOrientation = (index: number) => {
    const newList = orientationsList.filter((_, i) => i !== index);
    setOrientationsList(newList);
  };

  useEffect(() => {
    const fetchDossier = async () => {
      if (!bureauId && role !== 'Super_admin') return;
      if (!id) return;

      try {
        const { data: foundDossier, error } = await supabase
          .from('dossiers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Supabase query error (EditDossier):', error);
          throw error;
        }

        if (foundDossier) {
          if (role !== 'Super_admin' && foundDossier.bureau_id !== bureauId) {
            setOriginalDossier(null);
          } else if (role !== 'admin' && role !== 'Super_admin' && role !== 'Secrétaire' && role !== 'Secrétaire Arrivée' && foundDossier.user_id !== user?.id) {
            setOriginalDossier(null);
          } else {
            setOriginalDossier(foundDossier);
            
            const parsedList = parseOrientations(foundDossier.orientation, foundDossier.annotation);
            if (parsedList.length > 0) {
              setOrientationsList(parsedList);
            }

            setFormData({
              type_dossier: foundDossier.type_dossier || 'Arrivée',
              objet: foundDossier.objet || '',
              expediteur: foundDossier.expediteur || '',
              numero_expediteur: foundDossier.numero_expediteur || '',
              date_arrivee: foundDossier.date_arrivee || '',
              numero_enregistrement: foundDossier.numero_enregistrement || '',
              numero_orientation: foundDossier.numero_orientation || '',
              observation: foundDossier.observation || '',
              statut: foundDossier.statut || 'Reçu'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching dossier:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchDossier();
  }, [bureauId, id, role, user?.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      if (id && user) {
        const validOrientations = orientationsList.filter(o => o.service.trim() !== '');
        const orientationsStr = JSON.stringify(validOrientations);
        const combinedAnnotations = validOrientations.map(o => o.annotation).filter(a => a).join(' | ');

        const updatePayload = {
          ...formData,
          orientation: orientationsStr,
          annotation: combinedAnnotations
        };

        const { error } = await supabase
          .from('dossiers')
          .update(updatePayload)
          .eq('id', id);

        if (error) throw error;

        // Add Notification if status changed
        if (originalDossier && originalDossier.statut !== formData.statut) {
          await supabase.from('notifications').insert([
            {
              bureau_id: bureauId,
              message: `Dossier "${originalDossier.numero_enregistrement || originalDossier.objet}" passé en "${formData.statut}"`,
              read: false
            }
          ]);
        }
      }
      navigate(`/dossiers/${id}`);
    } catch (error) {
      console.error('Error updating dossier:', error);
      alert('Erreur lors de la mise à jour du dossier');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Auto-fill numero_orientation with numero_enregistrement when switching to Départ if empty
      if (name === 'type_dossier' && value === 'Départ' && !prev.numero_orientation && prev.numero_enregistrement) {
        newData.numero_orientation = prev.numero_enregistrement;
      }
      return newData;
    });
  };

  if (initialLoading) {
    return <div className="animate-pulse">Chargement du dossier...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl border border-gray-100 transform transition-all">
            <div className="flex items-center space-x-4 text-blue-600 mb-6">
              <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-gray-900">Confirmer la modification ?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              Voulez-vous vraiment enregistrer les modifications de ce dossier ?
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={loading}
                className="flex-[2] inline-flex items-center justify-center px-6 py-4 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Oui, modifier'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <Link to={`/dossiers/${id}`} className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au dossier
        </Link>
      </div>

      <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Modifier le Dossier</h1>
              <p className="mt-2 text-blue-100 font-medium">
                Mise à jour des informations pour le dossier <span className="font-bold text-white">{originalDossier?.numero_enregistrement || originalDossier?.objet}</span>
              </p>
            </div>
            <div className="hidden sm:block">
              <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/30">
                Mode Édition
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-8 sm:p-10">
          <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="space-y-8">
            <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2">
              
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">
                  Type de dossier <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <label className={`flex-1 flex items-center justify-center px-4 py-4 rounded-xl border-2 cursor-pointer transition-all ${formData.type_dossier === 'Arrivée' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
                    <input type="radio" name="type_dossier" value="Arrivée" checked={formData.type_dossier === 'Arrivée'} onChange={handleChange} className="sr-only" />
                    <span className="font-black text-lg">Arrivée</span>
                  </label>
                  {(role === 'admin' || role === 'Secrétaire Départ' || role === 'Super_admin' || role === 'Secrétaire') && (
                    <label className={`flex-1 flex items-center justify-center px-4 py-4 rounded-xl border-2 cursor-pointer transition-all ${formData.type_dossier === 'Départ' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
                      <input type="radio" name="type_dossier" value="Départ" checked={formData.type_dossier === 'Départ'} onChange={handleChange} className="sr-only" />
                      <span className="font-black text-lg">Départ</span>
                    </label>
                  )}
                </div>
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
                  value={formData.objet}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="expediteur" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Expéditeur (Service) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="expediteur"
                  id="expediteur"
                  required
                  value={formData.expediteur}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="numero_expediteur" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  N° Service <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="numero_expediteur"
                  id="numero_expediteur"
                  required
                  value={formData.numero_expediteur}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="numero_enregistrement" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Numéro d'enregistrement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="numero_enregistrement"
                  id="numero_enregistrement"
                  required
                  value={formData.numero_enregistrement}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all"
                />
              </div>

              <div>
                <label htmlFor="statut" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Statut actuel
                </label>
                <select
                  name="statut"
                  id="statut"
                  value={formData.statut}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 font-bold focus:border-blue-500 focus:ring-blue-500 border transition-all appearance-none bg-white"
                >
                  <option value="Reçu">Reçu</option>
                  <option value="En cours">En cours</option>
                  <option value="Transmis">Transmis</option>
                  <option value="Terminé">Terminé</option>
                </select>
              </div>

              {formData.type_dossier === 'Départ' ? (
                <div className="sm:col-span-2 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">
                      Orientations (Services) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addOrientation}
                      className="text-xs text-blue-600 font-bold hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                    >
                      + Ajouter
                    </button>
                  </div>
                  
                  {orientationsList.map((item, index) => (
                    <div key={index} className="pl-4 border-l-2 border-blue-500 space-y-3 relativ bg-gray-50 p-4 rounded-xl relative">
                      {orientationsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrientation(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div>
                        <input
                          type="text"
                          required
                          className="block w-full rounded-xl border-gray-200 py-2.5 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
                          placeholder="Nom du service..."
                          value={item.service}
                          onChange={(e) => updateOrientation(index, 'service', e.target.value)}
                        />
                      </div>
                      <div>
                        <textarea
                          rows={2}
                          className="block w-full rounded-xl border-gray-200 py-2.5 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all resize-none"
                          placeholder="Note ou annotation..."
                          value={item.annotation}
                          onChange={(e) => updateOrientation(index, 'annotation', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sm:col-span-2 p-6 rounded-2xl bg-gray-50 border border-gray-100 italic text-sm text-gray-500 text-center">
                  Les orientations ne sont actives qu'en mode "Départ".
                </div>
              )}

              <div className="sm:col-span-2">
                <label htmlFor="numero_orientation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Numéro d'Orientation Global
                </label>
                <input
                  type="text"
                  name="numero_orientation"
                  id="numero_orientation"
                  disabled={formData.type_dossier !== 'Départ'}
                  value={formData.numero_orientation}
                  onChange={handleChange}
                  className={`block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all ${formData.type_dossier !== 'Départ' ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}`}
                />
                {formData.type_dossier === 'Départ' && (
                  <p className="mt-1.5 text-[10px] text-gray-500 font-medium italic">
                    Même numéro que l'enregistrement (interne) ou nouveau numéro (externe).
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="observation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Observation
                </label>
                <textarea
                  id="observation"
                  name="observation"
                  disabled={formData.type_dossier !== 'Départ'}
                  rows={2}
                  value={formData.observation}
                  onChange={handleChange}
                  className={`block w-full rounded-xl border-gray-200 py-3 px-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500 border transition-all resize-none ${formData.type_dossier !== 'Départ' ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="pt-8 flex items-center justify-end space-x-4 border-t border-gray-100">
              <Link
                to={`/dossiers/${id}`}
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
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Save className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Enregistrer les modifications
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

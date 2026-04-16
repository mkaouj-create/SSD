import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Clock, FileText, Edit, Trash2, AlertTriangle, MessageSquare, Activity, User } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  'Reçu': 'bg-gray-100 text-gray-800',
  'En cours': 'bg-yellow-100 text-yellow-800',
  'Transmis': 'bg-blue-100 text-blue-800',
  'Terminé': 'bg-green-100 text-green-800',
};

export const DossierDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { bureauId, role, user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<any>(null);
  const [transmissions, setTransmissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showTransmitModal, setShowTransmitModal] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [bureaus, setBureaus] = useState<any[]>([]);
  const [departData, setDepartData] = useState({
    statut: 'Transmis',
    orientation: '',
    numero_orientation: '',
    annotation: ''
  });

  const fetchBureaus = async () => {
    try {
      const { data, error } = await supabase
        .from('bureaus')
        .select('id, name')
        .neq('id', bureauId);
      if (error) throw error;
      setBureaus(data || []);
    } catch (error) {
      console.error('Error fetching bureaus:', error);
    }
  };

  const handleTransmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsTransmitting(true);
    try {
      const { error: dossierUpdateError } = await supabase
        .from('dossiers')
        .update({
          statut: departData.statut,
          orientation: departData.orientation,
          numero_orientation: departData.numero_orientation,
          annotation: departData.annotation,
          date_sortie: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (dossierUpdateError) throw dossierUpdateError;

      // Log the departure in audit logs and/or transmissions if desired
      // We will create a transmission log without destination bureau just to keep history
      await supabase
        .from('transmissions')
        .insert([
          {
            dossier_id: id,
            source_bureau_id: bureauId,
            niveau: 'Normal',
            commentaire: departData.annotation,
            user_id: user?.id
          }
        ]);

      await supabase.from('audit_logs').insert([
        {
          dossier_id: id,
          bureau_id: bureauId,
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || 'Utilisateur',
          action: `Départ du dossier - Orientation: ${departData.orientation || 'Non spécifiée'}`,
          details: departData
        }
      ]);

      setShowTransmitModal(false);
      setDepartData({ statut: 'Transmis', orientation: '', numero_orientation: '', annotation: '' });
      fetchData();
    } catch (error) {
      console.error('Error starting depart:', error);
      alert('Erreur lors du départ du dossier');
    } finally {
      setIsTransmitting(false);
    }
  };

  const fetchData = async () => {
    if (!bureauId && role !== 'Super_admin') return;
    if (!id) return;

    try {
      const [dossierRes, transRes, logRes] = await Promise.all([
        supabase.from('dossiers').select('*').eq('id', id).single(),
        supabase.from('transmissions').select('*').eq('dossier_id', id).order('date_transmission', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
      ]);

      if (dossierRes.error) throw dossierRes.error;
      
      const foundDossier = dossierRes.data;
      if (foundDossier) {
        if (role !== 'Super_admin' && foundDossier.bureau_id !== bureauId) {
          setDossier(null);
        } else if (role !== 'admin' && role !== 'Super_admin' && role !== 'Secrétaire' && foundDossier.user_id !== user?.id) {
          setDossier(null);
        } else {
          setDossier(foundDossier);
        }
      }

      setTransmissions(transRes.data || []);
      setAuditLogs(logRes.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBureaus();

    // Real-time subscriptions
    const dossierChannel = supabase
      .channel(`dossier_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers', filter: `id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transmissions', filter: `dossier_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(dossierChannel);
    };
  }, [bureauId, id, role, user?.id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (id) {
        const { error } = await supabase
          .from('dossiers')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }
      navigate('/dossiers');
    } catch (error) {
      console.error('Error deleting dossier:', error);
      alert('Erreur lors de la suppression du dossier');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Chargement des détails du dossier...</div>;
  }

  if (!dossier) {
    return <div>Dossier introuvable.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-gray-100 transform transition-all">
            <div className="flex items-center space-x-4 text-red-600 mb-4">
              <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Supprimer le dossier ?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le dossier <span className="font-bold text-gray-900">{dossier.numero_enregistrement || dossier.objet}</span> ? Cette action effacera définitivement toutes les données associées.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/dossiers" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Link>
        <div className="flex items-center space-x-3">
          {hasPermission('manage_dossiers') && (
            <>
              <button
                onClick={() => {
                  setDepartData({
                    statut: dossier.statut || 'Transmis',
                    orientation: dossier.orientation || '',
                    numero_orientation: dossier.numero_orientation || dossier.numero_enregistrement || '',
                    annotation: dossier.annotation || ''
                  });
                  setShowTransmitModal(true);
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                <Activity className="mr-2 h-4 w-4" />
                Transmettre
              </button>
              <Link
                to={`/dossiers/${dossier.id}/edit`}
                className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
              >
                <Edit className="mr-2 h-4 w-4 text-gray-400" />
                Modifier
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-red-50 text-sm font-bold text-red-700 hover:bg-red-100 transition-all"
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Dossier {dossier.type_dossier || 'Arrivée'}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight">{dossier.numero_enregistrement || 'Sans numéro'}</h1>
              </div>
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${statusColors[dossier.statut] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                {dossier.statut}
              </span>
            </div>
            
            <div className="p-8">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Numéro d'enregistrement</dt>
                  <dd className="text-lg font-bold text-gray-900 leading-tight">{dossier.numero_enregistrement || 'Non spécifié'}</dd>
                </div>
                
                <div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Expéditeur (Service)</dt>
                  <dd className="text-sm font-semibold text-gray-700">{dossier.expediteur || 'Non spécifié'}</dd>
                </div>

                <div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">N° Service</dt>
                  <dd className="text-sm font-semibold text-gray-700">{dossier.numero_expediteur || '-'}</dd>
                </div>
                
                <div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date d'arrivée</dt>
                  <dd className="text-sm font-semibold text-gray-700">
                    {dossier.date_arrivee ? format(new Date(dossier.date_arrivee), 'dd MMMM yyyy', { locale: undefined }) : '-'}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Enregistrement</dt>
                  <dd className="text-sm font-semibold text-gray-700">{dossier.numero_enregistrement || '-'}</dd>
                </div>
                
                <div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Orientation</dt>
                  <dd className="text-sm font-semibold text-gray-700">{dossier.orientation || '-'}</dd>
                </div>

                <div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Numéro d'Orientation</dt>
                  <dd className="text-sm font-semibold text-gray-700">{dossier.numero_orientation || '-'}</dd>
                </div>
                
                <div className="sm:col-span-2 pt-6 border-t border-gray-50">
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Annotation</dt>
                  <dd className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl italic">
                    {dossier.annotation || 'Aucune annotation particulière.'}
                  </dd>
                </div>
                
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Observation</dt>
                  <dd className="text-sm text-gray-600">
                    {dossier.observation || 'Aucune observation enregistrée.'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Right Column: History & Transmissions */}
        <div className="space-y-8">
          {/* Transmissions Section */}
          {(hasPermission('manage_dossiers') || hasPermission('view_dossiers')) && (
            <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-blue-600 mr-3" />
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Transmissions</h3>
                </div>
              </div>
              <div className="p-8">
                <div className="space-y-6">
                  {transmissions.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400 font-medium italic">Aucune transmission enregistrée.</p>
                    </div>
                  ) : (
                    transmissions.map((trans, idx) => (
                      <div key={trans.id} className="relative pl-8 pb-6 last:pb-0">
                        {idx !== transmissions.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-100"></div>
                        )}
                        <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-900">Vers {trans.destination_bureau_name || 'service externe'}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {format(new Date(trans.date_transmission), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Niveau: {trans.niveau}</div>
                          {trans.commentaire && (
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                              "{trans.commentaire}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Section */}
          {(hasPermission('manage_dossiers') || hasPermission('view_dossiers')) && (
            <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-blue-600 mr-3" />
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Historique</h3>
                </div>
              </div>
              <div className="p-8">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {auditLogs.map((log, logIdx) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== auditLogs.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-4">
                            <div>
                              <span className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center ring-4 ring-white">
                                <Activity className="h-4 w-4 text-blue-600" aria-hidden="true" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                              <div>
                                <p className="text-xs font-bold text-gray-900">
                                  {log.action}
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                  par <span className="capitalize">{log.user_name}</span>
                                </p>
                              </div>
                              <div className="whitespace-nowrap text-right text-[10px] font-bold text-gray-400 uppercase">
                                {format(new Date(log.created_at), "dd/MM/yyyy")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transmit Modal */}
      {showTransmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
              <h3 className="text-xl font-black tracking-tight">Départ (Transmettre)</h3>
              <p className="text-blue-100 text-sm font-medium mt-1">Marquez le départ de ce dossier vers un autre service.</p>
            </div>
            
            <form onSubmit={handleTransmit} className="p-8 space-y-6">
              
              <div>
                <label htmlFor="statut" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Statut actuel <span className="text-red-500">*</span>
                </label>
                <select
                  id="statut"
                  required
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
                  value={departData.statut}
                  onChange={(e) => setDepartData({ ...departData, statut: e.target.value })}
                >
                  <option value="Reçu">Reçu</option>
                  <option value="En cours">En cours</option>
                  <option value="Transmis">Transmis</option>
                  <option value="Terminé">Terminé</option>
                </select>
              </div>

              <div>
                <label htmlFor="orientation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Orientation / Service (Destination)
                </label>
                <input
                  type="text"
                  id="orientation"
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
                  placeholder="Nom du service..."
                  value={departData.orientation}
                  onChange={(e) => setDepartData({ ...departData, orientation: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="num_orientation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Numéro d'Orientation
                </label>
                <input
                  type="text"
                  id="num_orientation"
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
                  placeholder="Numéro de transmission..."
                  value={departData.numero_orientation}
                  onChange={(e) => setDepartData({ ...departData, numero_orientation: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="annotation" className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Annotation
                </label>
                <textarea
                  id="annotation"
                  rows={3}
                  className="block w-full rounded-xl border-gray-200 py-3 px-4 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all resize-none"
                  placeholder="Note ou annotation liée à ce départ..."
                  value={departData.annotation}
                  onChange={(e) => setDepartData({ ...departData, annotation: e.target.value })}
                />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransmitModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isTransmitting}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:bg-blue-400"
                >
                  {isTransmitting ? 'Enregistrement...' : 'Valider le départ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

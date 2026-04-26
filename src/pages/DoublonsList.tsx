import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Edit, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const DoublonsList = () => {
  const { bureauId, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<any[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDuplicates();
  }, [bureauId]);

  const fetchDuplicates = async () => {
    if (!bureauId && role !== 'Super_admin') return;
    setLoading(true);
    try {
      // Fetch all dossiers that have a numero_enregistrement
      let query = supabase
        .from('dossiers')
        .select('*, bureaus(name)')
        .neq('numero_enregistrement', '')
        .not('numero_enregistrement', 'is', null)
        .order('date_arrivee', { ascending: false });

      if (role !== 'Super_admin') {
        query = query.eq('bureau_id', bureauId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Group by Bureau + N° Enregistrement + Year
        const groups = new Map<string, any[]>();

        data.forEach(dossier => {
          if (!dossier.numero_enregistrement || !dossier.date_arrivee) return;
          const year = dossier.date_arrivee.substring(0, 4);
          const key = `${dossier.bureau_id}-${dossier.numero_enregistrement.trim().toLowerCase()}-${year}`;
          
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key)!.push(dossier);
        });

        // Filter out groups with only 1 item
        const duplicates = Array.from(groups.values()).filter(group => group.length > 1);
        setDuplicateGroups(duplicates);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du chargement des doublons.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-[100%] mx-auto">
      <div className="mb-6 flex flex-col justify-between items-start">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
          <AlertCircle className="mr-3 h-8 w-8 text-orange-500" />
          Dossiers en Doublons
        </h1>
        <p className="text-gray-500 mt-2">
          Cette section affiche les dossiers partageant le même <b>N° Enregistrement</b> et la même <b>Année d'arrivée</b>. Veuillez les vérifier et les corriger.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {duplicateGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 animate-pulse-slow" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">Aucun doublon détecté</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Tous les dossiers ont un N° d'Enregistrement unique pour leur année respective. Excellent travail !
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {duplicateGroups.map((group, groupIndex) => {
            const year = group[0].date_arrivee.substring(0, 4);
            const numEnreg = group[0].numero_enregistrement;
            
            return (
              <div key={groupIndex} className="bg-white rounded-xl shadow-sm border-l-4 border border-l-orange-500 overflow-hidden">
                <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full flex items-center">
                       {group.length} Doublons trouvés
                     </span>
                     <h3 className="text-lg font-bold text-gray-900">
                        N° {numEnreg} (Année {year}) {role === 'Super_admin' && group[0].bureaus?.name ? `- Bureau: ${group[0].bureaus.name}` : ''}
                     </h3>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {role === 'Super_admin' && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bureau</th>}
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tracking Code</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date d'arrivée</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Objet</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expéditeur</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.map((dossier) => (
                        <tr key={dossier.id} className="hover:bg-gray-50/50 transition-colors">
                          {role === 'Super_admin' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900 border border-gray-200 px-2 py-1 rounded bg-gray-50">
                                {dossier.bureaus?.name || 'Inconnu'}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 font-mono">
                              {dossier.tracking_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(dossier.date_arrivee), 'dd/MM/yyyy', { locale: fr })}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900 line-clamp-1 max-w-[200px]" title={dossier.objet}>
                              {dossier.objet}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 truncate max-w-[150px]">
                              {dossier.expediteur || '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              dossier.type_dossier === 'Départ' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {dossier.type_dossier}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end gap-3">
                              <Link
                                to={`/dossiers/${dossier.id}`}
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center font-semibold"
                              >
                                Voir <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                              <Link
                                to={`/dossiers/${dossier.id}/edit`}
                                className="text-orange-600 hover:text-orange-800 inline-flex items-center font-semibold"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoublonsList;

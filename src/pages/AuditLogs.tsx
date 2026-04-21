import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Activity, Search, Calendar, Filter, User } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const AuditLogs = () => {
  const { bureauId, role } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [bureauId, role]);

  const fetchLogs = async () => {
    if (!bureauId && role !== 'Super_admin') return;
    
    setLoading(true);
    setError(null);
    try {
      // Setup the 30-day retention constraint
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          user_name,
          user_id,
          dossiers (
            tracking_code
          )
        `)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (role !== 'Super_admin') {
        query = query.eq('bureau_id', bureauId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement du journal d\'audit.');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs locally
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details?.tracking_code || log.dossiers?.tracking_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesAction = actionFilter ? log.action.includes(actionFilter) : true;
    
    const matchesDate = dateFilter 
      ? log.created_at.startsWith(dateFilter) 
      : true;

    return matchesSearch && matchesAction && matchesDate;
  });

  const getActionColor = (action: string) => {
    if (action.includes('Création')) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes('Modification')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes('Suppression')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('Connexion')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (role !== 'admin' && role !== 'Super_admin') {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Accès Refusé</h2>
          <p className="text-gray-500 mt-2">Vous n'avez pas les autorisations nécessaires pour voir le journal d'audit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center justify-between mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            Journal d'Audit
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Traçabilité des actions utilisateurs. Les journaux sont conservés pendant une durée de <span className="font-bold text-gray-900">30 jours</span>.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm transition-all py-3"
              placeholder="Rechercher (utilisateur, action, code...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <select
              className="block w-full rounded-xl border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm transition-all py-3 bg-white"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Tous les types d'actions</option>
              <option value="Création">Créations</option>
              <option value="Modification">Modifications</option>
              <option value="Suppression">Suppressions</option>
              <option value="Connexion">Connexions</option>
            </select>
          </div>
          
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="date"
              className="block w-full rounded-xl border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm transition-all py-3"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center bg-white rounded-2xl shadow-sm border border-gray-100 py-16">
          <Activity className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">Aucun journal trouvé</h3>
          <p className="mt-1 flex items-center text-sm text-gray-500 justify-center">
            Aucune action ne correspond à vos critères ou le journal est vide.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Date & Heure
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {log.user_name || 'Système'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {log.details ? (
                        <div className="space-y-1">
                          {log.details.tracking_code && (
                            <div className="font-bold text-gray-900">
                              Dossier: {log.details.tracking_code}
                            </div>
                          )}
                          {log.details.old_status && log.details.new_status && (
                            <div className="flex items-center text-xs">
                              <span className="line-through text-gray-400 mr-2">{log.details.old_status}</span>
                              <span className="text-blue-500 font-bold">→ {log.details.new_status}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Aucun détail supplémentaire</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

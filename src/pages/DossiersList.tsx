import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export const DossiersList = () => {
  const { bureauId, role, user } = useAuth();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Arrivée');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const fetchDossiers = async () => {
    if (!bureauId && role !== 'Super_admin') return;
    
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('dossiers')
        .select('*')
        .order('date_arrivee', { ascending: false });
      
      if (role !== 'Super_admin') {
        query = query.eq('bureau_id', bureauId);
      }
      
      // If user is not admin or Super_admin, they only see their own dossiers
      if (role !== 'admin' && role !== 'Super_admin' && role !== 'Secrétaire') {
        query = query.eq('user_id', user?.id);
      }
      
      if (statusFilter) {
        query = query.eq('statut', statusFilter);
      }

      if (dateStart) {
        query = query.gte('date_arrivee', dateStart);
      }

      if (dateEnd) {
        query = query.lte('date_arrivee', dateEnd);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Supabase query error:', queryError);
        throw queryError;
      }
      setDossiers(data || []);
    } catch (err: any) {
      console.error('Error fetching dossiers:', err);
      if (err.message === 'Failed to fetch') {
        setError('Erreur de connexion : Impossible de joindre le serveur Supabase. Vérifiez votre connexion internet ou si un bloqueur de publicité empêche l\'accès.');
      } else {
        setError(err.message || 'Une erreur est survenue lors du chargement des dossiers.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossiers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('dossiers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dossiers',
          filter: role !== 'Super_admin' ? `bureau_id=eq.${bureauId}` : undefined
        },
        () => {
          fetchDossiers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bureauId, statusFilter, dateStart, dateEnd, role, user?.id]);

  const filteredDossiers = dossiers.filter(d => {
    const isDepart = (d.type_dossier === 'Départ' || d.statut === 'Transmis');
    const matchesTab = activeTab === 'Arrivée' ? !isDepart : isDepart;
    
    const matchesSearch = 
      (d.numero_enregistrement && d.numero_enregistrement.toLowerCase().includes(searchTerm.toLowerCase())) ||
      d.objet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.expediteur && d.expediteur.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesTab && matchesSearch;
  });

  const statusColors: Record<string, string> = {
    'Reçu': 'bg-gray-100 text-gray-800',
    'En cours': 'bg-yellow-100 text-yellow-800',
    'Transmis': 'bg-blue-100 text-blue-800',
    'Terminé': 'bg-green-100 text-green-800',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center justify-between mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dossiers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gérez et suivez l'évolution de tous les dossiers de votre bureau.
          </p>
        </div>
        {(role === 'admin' || role === 'agent') && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Link
              to="/dossiers/new"
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Nouveau Dossier
            </Link>
          </div>
        )}
      </div>

      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('Arrivée')}
          className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'Arrivée' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          Dossiers Arrivée
        </button>
        <button
          onClick={() => setActiveTab('Départ')}
          className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'Départ' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          Dossiers Départ
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
            placeholder="Rechercher par n° d'enregistrement, objet ou expéditeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="relative group min-w-[160px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
            </div>
            <select
              className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="Reçu">Reçu</option>
              <option value="En cours">En cours</option>
              <option value="Transmis">Transmis</option>
              <option value="Terminé">Terminé</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="block rounded-xl border-gray-200 py-2.5 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              placeholder="Du"
            />
            <span className="text-gray-400 font-bold">à</span>
            <input
              type="date"
              className="block rounded-xl border-gray-200 py-2.5 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              placeholder="Au"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        {error ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <Filter className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Erreur de chargement</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchDossiers()}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      N° Enregistrement
                    </th>
                    <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Objet
                    </th>
                    <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Expéditeur (Service)
                    </th>
                    <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Date d'arrivée
                    </th>
                    <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Statut
                    </th>
                    <th scope="col" className="relative px-8 py-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-5"><div className="h-8 w-24 bg-gray-100 rounded-xl"></div></td>
                        <td className="px-8 py-5"><div className="h-4 w-48 bg-gray-100 rounded-lg"></div></td>
                        <td className="px-8 py-5"><div className="h-4 w-32 bg-gray-100 rounded-lg"></div></td>
                        <td className="px-8 py-5"><div className="h-4 w-20 bg-gray-100 rounded-lg"></div></td>
                        <td className="px-8 py-5"><div className="h-6 w-16 bg-gray-100 rounded-full"></div></td>
                        <td className="px-8 py-5"><div className="h-8 w-20 bg-gray-100 rounded-xl"></div></td>
                      </tr>
                    ))
                  ) : filteredDossiers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-medium italic">
                        Aucun dossier trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredDossiers.map((dossier) => (
                      <tr key={dossier.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                            {dossier.numero_enregistrement || '-'}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-bold tracking-tight">
                            {dossier.objet.length > 40 ? `${dossier.objet.substring(0, 40)}...` : dossier.objet}
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-600">{dossier.expediteur || '-'}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-gray-400">
                          {format(new Date(dossier.date_arrivee), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[dossier.statut] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {dossier.statut}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <Link to={`/dossiers/${dossier.id}`} className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all">
                            Détails
                            <Plus className="ml-1.5 h-3 w-3" />
                          </Link>
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
                  <div key={i} className="p-5 animate-pulse space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="h-8 w-24 bg-gray-100 rounded-xl"></div>
                      <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
                    </div>
                    <div className="h-4 w-full bg-gray-100 rounded-lg"></div>
                    <div className="h-4 w-2/3 bg-gray-100 rounded-lg"></div>
                  </div>
                ))
              ) : filteredDossiers.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-medium italic">
                  Aucun dossier trouvé.
                </div>
              ) : (
                filteredDossiers.map((dossier) => (
                  <Link key={dossier.id} to={`/dossiers/${dossier.id}`} className="block p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {dossier.numero_enregistrement || '-'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors[dossier.statut] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                        {dossier.statut}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight mb-2">
                      {dossier.objet}
                    </h3>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {dossier.expediteur || '-'}
                      </div>
                      <div className="text-[10px] font-black text-gray-300">
                        {format(new Date(dossier.date_arrivee), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

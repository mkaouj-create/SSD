import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Building, Activity, Download, Filter, X, FolderOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { extractServices } from '../lib/orientationUtils';

export const Statistics = () => {
  const { bureauId, role, user, bureauName } = useAuth();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    orientation: '',
    statut: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchDossiers = async () => {
      if (!bureauId && role !== 'Super_admin') return;
      
      setLoading(true);
      try {
        let query = supabase.from('dossiers').select('*');
        if (role !== 'Super_admin') {
          query = query.eq('bureau_id', bureauId);
        }
        if (role !== 'admin' && role !== 'Super_admin' && role !== 'Secrétaire') {
          query = query.eq('user_id', user?.id);
        }

        const { data } = await query;
        if (data) {
          setDossiers(data);
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDossiers();
  }, [bureauId, role, user?.id]);

  const uniqueOrientations = useMemo(() => {
    const allServices = new Set<string>();
    dossiers.forEach(d => {
      extractServices(d.orientation).forEach(svc => allServices.add(svc));
    });
    return Array.from(allServices);
  }, [dossiers]);

  const uniqueStatus = useMemo(() => {
    const statuses = new Set(dossiers.map(d => d.statut).filter(Boolean));
    return Array.from(statuses);
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      let match = true;
      if (filters.dateStart && d.date_arrivee < filters.dateStart) match = false;
      if (filters.dateEnd && d.date_arrivee > filters.dateEnd) match = false;
      
      if (filters.orientation) {
        const docServices = extractServices(d.orientation);
        if (!docServices.includes(filters.orientation)) {
          match = false;
        }
      }
      
      if (filters.statut && d.statut !== filters.statut) match = false;
      return match;
    });
  }, [dossiers, filters]);

  const chartData = useMemo(() => {
    if (!filteredDossiers.length) return { byService: [], byMonth: [], byYear: [] };

    // 1. By Service / Orientation
    const serviceCount: Record<string, number> = {};
    filteredDossiers.forEach(d => {
      const services = extractServices(d.orientation);
      if (services.length === 0) {
        serviceCount['Non assigné'] = (serviceCount['Non assigné'] || 0) + 1;
      } else {
        services.forEach(svc => {
          serviceCount[svc] = (serviceCount[svc] || 0) + 1;
        });
      }
    });
    const byService = Object.keys(serviceCount)
      .map(key => ({ name: key, count: serviceCount[key] }))
      .sort((a, b) => b.count - a.count);

    // 2. By Month Map (all time, distinct formatting for each year/month combination)
    const monthMap: Record<string, number> = {};
    filteredDossiers.forEach(d => {
        if (!d.date_arrivee) return;
        const key = format(parseISO(d.date_arrivee), 'MMM yyyy', { locale: fr });
        monthMap[key] = (monthMap[key] || 0) + 1;
    });

    // 3. By Year
    const yearCount: Record<string, number> = {};
    const thisYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        yearCount[(thisYear - i).toString()] = 0;
    }
    
    filteredDossiers.forEach(d => {
        if (!d.date_arrivee) return;
        const year = parseISO(d.date_arrivee).getFullYear().toString();
        if (yearCount[year] !== undefined) {
            yearCount[year]++;
        } else {
            yearCount[year] = 1;
        }
    });

    const byYear = Object.keys(yearCount)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => ({
            name: key,
            Dossiers: yearCount[key]
        }));
    
    // Monthly chronological data for the line chart
    const byMonthChronological = Object.keys(monthMap)
        .sort((a, b) => {
           // Quick sort logic by year then month parsing...
           // For simplicity, we just use the raw dates from dossiers to build chronological list
           return 0;
        });
        
    // Let's refine the byMonth list to be the last 12 months in chronological order
    const byMonth12: {name: string, Dossiers: number}[] = [];
    for(let i=11; i>=0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const name = format(d, 'MMM yyyy', { locale: fr });
        byMonth12.push({
            name,
            Dossiers: monthMap[name] || 0
        });
    }

    return { byService, byMonth: byMonth12, byYear };
  }, [filteredDossiers]);

  const exportToCSV = () => {
    if (!filteredDossiers.length) return;
    
    const headers = ['Code', 'Date Arrivée', 'Expéditeur', 'Objet', 'Service (Orientation)', 'Statut'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + '\n'
      + filteredDossiers.map(d => {
          const svcs = extractServices(d.orientation).join(' - ');
          return `${d.tracking_code},${d.date_arrivee},"${d.expediteur || ''}","${d.objet.replace(/"/g, '""')}","${svcs}",${d.statut}`;
      }).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statistiques_dossiers_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Statistiques Détaillées</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Analyse des flux de documents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border rounded-xl text-sm font-bold transition-all shadow-sm ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres {(filters.dateStart || filters.dateEnd || filters.orientation || filters.statut) && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                {[filters.dateStart, filters.dateEnd, filters.orientation, filters.statut].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Filtres Avancés</h3>
            {(filters.dateStart || filters.dateEnd || filters.orientation || filters.statut) && (
              <button
                onClick={() => setFilters({ dateStart: '', dateEnd: '', orientation: '', statut: '' })}
                className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date de début (Arrivée)</label>
              <input
                type="date"
                value={filters.dateStart}
                onChange={e => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date de fin (Arrivée)</label>
              <input
                type="date"
                value={filters.dateEnd}
                onChange={e => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Service (Orientation)</label>
              <select
                value={filters.orientation}
                onChange={e => setFilters(prev => ({ ...prev, orientation: e.target.value }))}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Tous les services</option>
                {uniqueOrientations.map((opt: any) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Statut</label>
              <select
                value={filters.statut}
                onChange={e => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Tous les statuts</option>
                {uniqueStatus.map((opt: any) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Par Année */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col max-h-[500px]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Évolution Annuelle</h3>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 top-0 sticky">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Année</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Dossiers traités</th>
                </tr>
              </thead>
              <tbody>
                {chartData.byYear.map((item) => (
                  <tr key={item.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {item.Dossiers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Par Mois (12D) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col max-h-[500px]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Flux sur 12 Mois</h3>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 top-0 sticky">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Mois</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Dossiers</th>
                </tr>
              </thead>
              <tbody>
                {chartData.byMonth.map((item) => (
                  <tr key={item.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 capitalize">{item.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {item.Dossiers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Par Service */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 lg:col-span-2 flex flex-col max-h-[600px]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Distribution par Service</h3>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 top-0 sticky z-10">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Service (Orientation)</th>
                  <th className="px-4 py-3 text-right">Nombre de dossiers</th>
                  <th className="px-4 py-3 rounded-r-xl w-32"></th>
                </tr>
              </thead>
              <tbody>
                {chartData.byService.map((item) => {
                  const maxCount = chartData.byService[0]?.count || 1;
                  const percentage = Math.round((item.count / maxCount) * 100);
                  
                  return (
                    <tr key={item.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 font-bold text-gray-900">{item.name}</td>
                      <td className="px-4 py-4 text-right font-black text-purple-600">{item.count}</td>
                      <td className="px-4 py-4">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Liste Complète des Dossiers */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-green-50 text-green-600">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Liste des Dossiers Enregistrés</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
              {filteredDossiers.length} dossiers trouvés
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-separate border-spacing-y-2">
              <thead className="text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-black">Code Tracking</th>
                  <th className="px-4 py-3 font-black">Date Arrivée</th>
                  <th className="px-4 py-3 font-black">Expéditeur</th>
                  <th className="px-4 py-3 font-black">Objet</th>
                  <th className="px-4 py-3 font-black">Orientation</th>
                  <th className="px-4 py-3 font-black">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredDossiers.map((d) => (
                  <tr key={d.id} className="bg-white hover:bg-blue-50/50 transition-all group">
                    <td className="px-4 py-4 font-bold text-blue-600 border-y border-l border-gray-50 rounded-l-2xl">
                      {d.tracking_code}
                    </td>
                    <td className="px-4 py-4 text-gray-500 font-medium border-y border-gray-50">
                      {d.date_arrivee ? format(parseISO(d.date_arrivee), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-bold border-y border-gray-50">
                      {d.expediteur || '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 font-medium border-y border-gray-50 max-w-xs truncate">
                      {d.objet}
                    </td>
                    <td className="px-4 py-4 text-purple-600 font-bold border-y border-gray-50">
                      {extractServices(d.orientation).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-4 border-y border-r border-gray-50 rounded-r-2xl">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        d.statut === 'Terminé' ? 'bg-green-100 text-green-700' :
                        d.statut === 'Transmis' ? 'bg-blue-100 text-blue-700' :
                        d.statut === 'En cours' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {d.statut || 'Reçu'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredDossiers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium">
                      Aucun dossier ne correspond aux filtres actuels.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

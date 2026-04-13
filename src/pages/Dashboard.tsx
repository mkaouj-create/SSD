import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Clock, CheckCircle, AlertCircle, Inbox, Send, Activity, TrendingUp } from 'lucide-react';

export const Dashboard = () => {
  const { bureauId, role, user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    recus: 0,
    enCours: 0,
    transmis: 0,
    termines: 0,
    enRetard: 0,
    completionRate: 0,
    recentCount: 0, // Added in the last 7 days
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!bureauId && role !== 'Super_admin') return;
    
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('dossiers').select('*');
      
      if (role !== 'Super_admin') {
        query = query.eq('bureau_id', bureauId);
      }
      
      // If user is not admin or Super_admin, they only see their own dossiers
      if (role !== 'admin' && role !== 'Super_admin' && role !== 'Secrétaire') {
        query = query.eq('user_id', user?.id);
      }

      const { data: bureauDossiers, error: queryError } = await query;

      if (queryError) {
        console.error('Supabase query error (Stats):', queryError);
        throw queryError;
      }

      if (bureauDossiers) {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        let total = 0;
        let recus = 0;
        let enCours = 0;
        let transmis = 0;
        let termines = 0;
        let enRetard = 0;
        let recentCount = 0;

        bureauDossiers.forEach((dossier) => {
          total++;
          if (dossier.statut === 'Reçu') recus++;
          if (dossier.statut === 'En cours') enCours++;
          if (dossier.statut === 'Transmis') transmis++;
          if (dossier.statut === 'Terminé') termines++;
          if (dossier.statut !== 'Terminé' && dossier.date_sortie && dossier.date_sortie < today) {
            enRetard++;
          }
          if (dossier.date_arrivee && dossier.date_arrivee >= sevenDaysAgoStr) {
            recentCount++;
          }
        });

        const completionRate = total > 0 ? Math.round((termines / total) * 100) : 0;

        setStats({ total, recus, enCours, transmis, termines, enRetard, completionRate, recentCount });
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      if (err.message === 'Failed to fetch') {
        setError('Erreur de connexion au serveur.');
      } else {
        setError(err.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time updates for dossiers in this bureau
    const channel = supabase
      .channel('dashboard_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dossiers',
          filter: role !== 'Super_admin' ? `bureau_id=eq.${bureauId}` : undefined
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bureauId, role, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Impossible de charger les données</h2>
        <p className="text-gray-600 mb-6 text-center max-w-md">{error}</p>
        <button
          onClick={() => fetchStats()}
          className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Dossiers', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Nouveaux (7j)', value: stats.recentCount, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Reçus', value: stats.recus, icon: Inbox, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { name: 'En cours', value: stats.enCours, icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Transmis', value: stats.transmis, icon: Send, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Traités', value: stats.termines, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
        {role === 'Super_admin' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
            Vue Super Administrateur (Global)
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {statCards.map((item) => (
          <div key={item.name} className="overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all transform hover:-translate-y-1">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className={`rounded-2xl p-3 ${item.bg}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-gray-900">{item.value}</div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{item.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Performance globale</h3>
          
          <div className="flex items-center justify-center mb-8">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-green-500"
                  strokeDasharray={`${stats.completionRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-gray-900">{stats.completionRate}%</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Complétés</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="text-sm font-bold text-gray-600">Dossiers en attente (Reçus + En cours)</span>
              <span className="text-lg font-black text-gray-900">{stats.recus + stats.enCours}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="text-sm font-bold text-gray-600">Dossiers terminés</span>
              <span className="text-lg font-black text-green-600">{stats.termines}</span>
            </div>
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Alertes & Retards</h3>
            <div className={`p-2 rounded-xl ${stats.enRetard > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {stats.enRetard > 0 ? (
                <AlertCircle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8">
            <div className={stats.enRetard > 0 ? 'text-red-600 text-6xl font-black mb-4' : 'text-green-600 text-6xl font-black mb-4'}>
              {stats.enRetard}
            </div>
            <p className="text-lg font-bold text-gray-700">
              Dossier{stats.enRetard !== 1 ? 's' : ''} en retard
            </p>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">
              {stats.enRetard > 0 
                ? "Ces dossiers ont dépassé leur date de sortie prévue et nécessitent une attention immédiate."
                : "Excellent travail ! Aucun dossier n'a dépassé sa date de sortie prévue."}
            </p>
          </div>

          {stats.enRetard > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-800 font-medium">
                Veuillez vérifier la liste des dossiers et filtrer par statut pour identifier les dossiers en retard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

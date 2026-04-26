import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Users, FileText, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BureausList = () => {
  const { role } = useAuth();
  const [bureaus, setBureaus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBureaus = async () => {
    setLoading(true);
    try {
      // Fetch bureaus with counts of users and dossiers
      const { data, error } = await supabase
        .from('bureaus')
        .select(`
          *,
          profiles(count),
          dossiers(count)
        `);

      if (error) throw error;
      setBureaus(data || []);
    } catch (error) {
      console.error('Error fetching bureaus:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'Super_admin') {
      fetchBureaus();
    }
  }, [role]);

  const filteredBureaus = bureaus.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (role !== 'Super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Accès restreint</h2>
        <p className="mt-2 text-gray-600">Seul le Super Administrateur peut gérer les bureaux.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des Bureaux</h1>
          <p className="mt-2 text-sm text-gray-600">
            Liste de toutes les organisations enregistrées sur la plateforme SSD.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un bureau..."
            className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-3xl h-56 shadow-xl border border-gray-100"></div>
          ))
        ) : filteredBureaus.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl shadow-sm border border-dashed border-gray-200">
            <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium italic">Aucun bureau trouvé.</p>
          </div>
        ) : (
          filteredBureaus.map((bureau) => (
            <div key={bureau.id} className="bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all overflow-hidden group transform hover:-translate-y-1">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-all duration-300">
                    <Building2 className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {bureau.id.substring(0, 8)}</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1 tracking-tight">{bureau.name}</h3>
                <p className="text-sm font-medium text-gray-500 mb-8">{bureau.email || 'Pas d\'email de contact'}</p>
                
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Utilisateurs</span>
                    <div className="flex items-center text-gray-900 font-black">
                      <Users className="h-4 w-4 mr-2 text-blue-500" />
                      {bureau.profiles?.[0]?.count || 0}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dossiers</span>
                    <div className="flex items-center text-gray-900 font-black">
                      <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                      {bureau.dossiers?.[0]?.count || 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50/50 px-8 py-4 flex justify-between items-center border-t border-gray-50">
                <button 
                  onClick={async () => {
                    const confirm = window.confirm(`Êtes-vous certain de vouloir supprimer le bureau "${bureau.name}" ? TOUS les dossiers, utilisateurs et données associés seront définitivement supprimés.`);
                    if(confirm) {
                      setLoading(true);
                      try {
                        const {error} = await supabase.from('bureaus').delete().eq('id', bureau.id);
                        if(error) throw error;
                        fetchBureaus();
                      } catch(e: any) {
                        alert("Erreur: " + e.message);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  className="text-red-600 hover:text-red-700 text-xs font-black uppercase tracking-widest inline-flex items-center transition-colors"
                >
                  Supprimer le bureau
                </button>
                <button className="text-blue-600 hover:text-blue-700 text-xs font-black uppercase tracking-widest inline-flex items-center transition-colors">
                  Gérer <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

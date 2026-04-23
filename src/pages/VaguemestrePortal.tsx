import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Search, Package, MapPin, X, Calendar, FileText, Filter, CalendarDays, CheckCircle2 } from 'lucide-react';

export const VaguemestrePortal = () => {
  const { bureauId, signOut, bureauName, user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const isDirecteur = role === 'Directeur';
  const currentYear = new Date().getFullYear();
  const targetService = isDirecteur ? '' : (user?.user_metadata?.service || '');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Selected dossier for details modal
  const [selectedDossier, setSelectedDossier] = useState<any>(null);

  const resetFilters = () => {
    setFilterYear(currentYear.toString());
    setFilterDate('');
    setFilterStatus('');
  };

  useEffect(() => {
    const searchDossiers = async () => {
      // If nothing is entered/selected, don't show results
      if (!searchQuery.trim() && !filterYear && !filterDate && !filterStatus) {
        setResults([]);
        return;
      }
      
      if (!bureauId) return;

      setIsSearching(true);
      try {
        const safeTargetService = targetService ? targetService.replace(/"/g, '""') : '';
        let query = supabase
          .from('dossiers')
          .select('*')
          .eq('bureau_id', bureauId)
          .order('created_at', { ascending: false });

        if (safeTargetService && !isDirecteur) {
          query = query.or(`orientation.eq."${safeTargetService}",expediteur.eq."${safeTargetService}"`);
        }

        if (searchQuery.trim()) {
           query = query.or(`numero_enregistrement.ilike.%${searchQuery}%,numero_expediteur.ilike.%${searchQuery}%,objet.ilike.%${searchQuery}%,expediteur.ilike.%${searchQuery}%,tracking_code.ilike.%${searchQuery}%`);
        }

        if (filterStatus) {
           query = query.eq('statut', filterStatus);
        }

        if (filterDate) {
           query = query.eq('date_arrivee', filterDate);
        } else if (filterYear) {
           query = query.gte('date_arrivee', `${filterYear}-01-01`).lte('date_arrivee', `${filterYear}-12-31`);
        }

        const { data, error } = await query.limit(50);

        if (!error && data) {
          setResults(data);
        }
      } catch (error) {
        console.error('Error searching dossiers:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchDossiers, 400);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, bureauId, filterYear, filterDate, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 fixed w-full top-0 z-10 flex justify-between items-center">
        <div className="flex items-center">
          <div className={`h-10 w-10 ${isDirecteur ? 'bg-orange-600' : 'bg-blue-600'} rounded-xl flex items-center justify-center mr-3 shadow-sm`}>
            <span className="text-white font-black text-xl">{isDirecteur ? 'D' : 'V'}</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">Portail {isDirecteur ? 'Directeur' : 'Vaguemestre'}</h1>
            {bureauName && <p className="text-xs text-gray-500 font-medium">{bureauName} {!isDirecteur && targetService && <span className="text-blue-600 font-bold ml-1">• Service: {targetService}</span>}</p>}
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = '/';
          }}
          className="text-sm font-bold text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg"
        >
          Déconnexion
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-20 p-6 md:p-12 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-100 rounded-full mb-4">
            <Search className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Suivi des Dossiers</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Recherchez rapidement un dossier par son numéro d'enregistrement, son objet ou son expéditeur.
            <br/>
            {isDirecteur ? (
              <span className="inline-block mt-2 px-3 py-1 bg-orange-50 text-orange-800 text-xs font-bold rounded-lg border border-orange-100">
                Affichage complet des dossiers du bureau
              </span>
            ) : (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                Affichage restreint aux dossiers liés au service : {targetService || 'Non spécifié'}
              </span>
            )}
          </p>
        </div>

        {/* Big Search Bar & Filters */}
        <div className="relative max-w-2xl mx-auto mb-10 shadow-xl rounded-2xl">
          <div className="flex items-center bg-white rounded-2xl border border-gray-200 overflow-hidden focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all z-20 relative">
            <div className="pl-6 pr-3 py-4 text-gray-400">
              <Search className="h-6 w-6" />
            </div>
            <input
              type="text"
              autoFocus
              className="w-full py-4 pr-3 text-lg text-gray-900 bg-transparent border-none focus:ring-0 outline-none placeholder-gray-400 font-medium"
              placeholder="Numéro enreg, N° Service, Objet, Code SSD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-4 text-gray-400 hover:text-gray-600 transition-colors bg-white z-10"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            
            <div className="h-8 w-px bg-gray-200 mx-1"></div>
            
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                if (e.target.value) setFilterDate('');
              }}
              className="hidden md:block py-4 pr-8 pl-4 bg-transparent border-none focus:ring-0 text-gray-700 font-bold outline-none cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <option value="">Toutes années</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="hidden md:block h-8 w-px bg-gray-200 mx-1"></div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-6 py-4 font-bold transition-colors ${showFilters || filterDate || filterStatus ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden sm:inline">Filtres</span>
              {(filterDate || filterStatus) && (
                <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 ml-1"></span>
              )}
            </button>
          </div>
          
          {/* Expanded Filters Panel */}
          {showFilters && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 z-10 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Mobile Year Select (visible only on small screens inside filters) */}
                <div className="md:hidden">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center">
                    <CalendarDays className="h-3 w-3 mr-1" /> Année
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      if (e.target.value) setFilterDate(''); // Clear specific date if year is selected
                    }}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-700 focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-medium py-3 px-4"
                  >
                    <option value="">Toutes les années</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Specific Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" /> Date précise
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      if (e.target.value) {
                         // Automatically set year match if a specific date is chosen
                         setFilterYear(e.target.value.substring(0, 4));
                      }
                    }}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-700 focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-medium py-3 px-4"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Statut
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-700 focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-medium py-3 px-4"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="Reçu">Reçu</option>
                    <option value="En cours">En cours</option>
                    <option value="Transmis">Transmis</option>
                    <option value="Terminé">Terminé</option>
                  </select>
                </div>

              </div>

              {(filterDate || filterStatus) && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Area */}
        {(searchQuery.trim() !== '' || filterYear || filterDate || filterStatus) && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
              Résultats de la recherche
              {isSearching && <span className="ml-3 text-blue-500 lowercase normal-case text-xs animate-pulse">recherche en cours...</span>}
            </h3>
            
            {!isSearching && results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm animate-in fade-in">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-gray-900">Aucun dossier trouvé</h4>
                <p className="text-gray-500 mt-1">Aucun dossier ne correspond à vos critères de filtrage ou de recherche.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    resetFilters();
                    setShowFilters(false);
                  }}
                  className="mt-4 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-colors"
                >
                  Effacer tous les filtres
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((dossier) => (
                  <div 
                    key={dossier.id} 
                    onClick={() => setSelectedDossier(dossier)}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-bold text-gray-900 line-clamp-2 pr-4">{dossier.objet}</h4>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-600 whitespace-nowrap">
                          {dossier.tracking_code}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center"><FileText className="h-3 w-3 mr-1" /> N° Enregistrement</p>
                          <p className="text-sm font-semibold text-gray-900">{dossier.numero_enregistrement || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center"><Package className="h-3 w-3 mr-1" /> Expéditeur</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{dossier.expediteur || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center"><Calendar className="h-3 w-3 mr-1" /> Reçu le</p>
                          <p className="text-sm font-semibold text-gray-900">{dossier.date_arrivee ? new Date(dossier.date_arrivee).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center"><MapPin className="h-3 w-3 mr-1" /> Statut</p>
                          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${
                            dossier.statut === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                            dossier.statut === 'Terminé' ? 'bg-green-100 text-green-800' :
                            dossier.statut === 'Transmis' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {dossier.statut}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-30 backdrop-blur-sm" onClick={() => setSelectedDossier(null)}></div>

            <div className="relative inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl z-50">
              <div className="absolute top-0 right-0 pt-6 pr-6">
                <button
                  type="button"
                  onClick={() => setSelectedDossier(null)}
                  className="text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-xl p-2 transition-colors"
                >
                  <span className="sr-only">Fermer</span>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center mb-6 border-b border-gray-100 pb-6 pr-10">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mr-4 ${
                  selectedDossier.statut === 'En cours' ? 'bg-yellow-100' :
                  selectedDossier.statut === 'Terminé' ? 'bg-green-100' :
                  selectedDossier.statut === 'Transmis' ? 'bg-purple-100' :
                  'bg-gray-100'
                }`}>
                  <FileText className={`h-6 w-6 ${
                    selectedDossier.statut === 'En cours' ? 'text-yellow-600' :
                    selectedDossier.statut === 'Terminé' ? 'text-green-600' :
                    selectedDossier.statut === 'Transmis' ? 'text-purple-600' :
                    'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Détails du Dossier</h3>
                  <p className="text-sm text-gray-500 font-medium">Code de suivi: <span className="font-bold text-gray-900">{selectedDossier.tracking_code}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column (Information Primary) */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Informations Générales</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Objet du dossier</p>
                        <p className="text-base font-semibold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedDossier.objet}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedDossier.type_dossier || 'Arrivée'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Statut</p>
                          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${
                            selectedDossier.statut === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                            selectedDossier.statut === 'Terminé' ? 'bg-green-100 text-green-800' :
                            selectedDossier.statut === 'Transmis' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedDossier.statut}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">N° Enregistrement</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedDossier.numero_enregistrement || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date d'arrivée</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedDossier.date_arrivee ? new Date(selectedDossier.date_arrivee).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Origine</h4>
                    <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                      <div>
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Service Expéditeur</p>
                        <p className="text-sm font-semibold text-blue-900">{selectedDossier.expediteur || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">N° Expéditeur</p>
                        <p className="text-sm font-semibold text-blue-900">{selectedDossier.numero_expediteur || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (Tracking / Transmission) */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Transmission</h4>
                    <div className="space-y-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-50">
                      <div>
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Service Orienté vers (Orientation)</p>
                        <p className="text-sm font-semibold text-orange-900">{selectedDossier.orientation || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">N° d'Orientation / Sortie</p>
                        <p className="text-sm font-semibold text-orange-900">{selectedDossier.numero_orientation || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Date de sortie / transmission</p>
                        <p className="text-sm font-semibold text-orange-900">
                          {selectedDossier.date_sortie ? new Date(selectedDossier.date_sortie).toLocaleDateString() : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Notes & Observations</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Annotation particulière</p>
                        <p className="text-sm font-semibold text-gray-900 whitespace-pre-wrap leading-relaxed">{selectedDossier.annotation || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Observation</p>
                        <p className="text-sm font-semibold text-gray-900 whitespace-pre-wrap leading-relaxed">{selectedDossier.observation || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedDossier(null)}
                  className="px-6 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

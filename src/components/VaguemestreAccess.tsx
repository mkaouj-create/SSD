import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Link2, Copy, Check, Info, ChevronDown, Search } from 'lucide-react';

type AccessType = 'Vaguemestre' | 'Directeur';

export const VaguemestreAccess = () => {
  const { bureauId, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [accessType, setAccessType] = useState<AccessType>('Vaguemestre');
  const [targetService, setTargetService] = useState('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Custom dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active links
  const [activeLinks, setActiveLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchActiveLinks = async () => {
    if (!bureauId) return;
    setLoadingLinks(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, requested_bureau_name, created_at')
        .eq('bureau_id', bureauId)
        .in('role', ['Vagmeustre', 'Directeur'])
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveLinks(data || []);
    } catch (err) {
      console.error('Error fetching active links:', err);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      if (!bureauId) return;
      setLoadingServices(true);
      try {
        // Fetch optimized: Limit to 5000 to prevent heavy payloads, just need recent unique services
        const { data, error } = await supabase
          .from('dossiers')
          .select('expediteur, orientation')
          .eq('bureau_id', bureauId)
          .limit(5000);
          
        if (error) throw error;
        
        const servicesSet = new Set<string>();
        data?.forEach(d => {
          if (d.expediteur && d.expediteur.trim()) servicesSet.add(d.expediteur.trim());
          if (d.orientation && d.orientation.trim()) servicesSet.add(d.orientation.trim());
        });
        
        setAvailableServices(Array.from(servicesSet).sort());
      } catch (err) {
        console.error('Error fetching services:', err);
      } finally {
        setLoadingServices(false);
      }
    };
    
    if (role === 'admin' || role === 'Super_admin') {
      fetchServices();
      fetchActiveLinks();
    }
  }, [bureauId, role]);

  const filteredServices = useMemo(() => {
    return availableServices.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [availableServices, searchTerm]);

  if (role !== 'admin' && role !== 'Super_admin') {
    return null;
  }

  const handleGenerateLink = async () => {
    if (!bureauId) return;
    if (accessType === 'Vaguemestre' && !targetService.trim()) {
      alert("Veuillez spécifier le service concerné avant de générer le lien.");
      return;
    }
    
    setLoading(true);
    setGeneratedLink('');
    setCopied(false);

    try {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuration Supabase manquante.");
      }

      const adminAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: 'vaguemestre-temp-key'
        }
      });
      
      const timestamp = Date.now().toString(36);
      const uniqueEmail = accessType === 'Directeur' 
        ? `directeur_${bureauId.substring(0, 8)}_${timestamp}@ssd-app.local`
        : `vaguemestre_${bureauId.substring(0, 8)}_${timestamp}@ssd-app.local`;
      
      const token = btoa(`${uniqueEmail}:${randomPassword}`);
      const link = `${window.location.origin}/shared-login?t=${token}`;

      const { data: newData, error: signUpError } = await adminAuthClient.auth.signUp({
        email: uniqueEmail,
        password: randomPassword,
        options: {
          data: {
            full_name: accessType === 'Directeur' ? 'Directeur' : `Vaguemestre - ${targetService}`,
            bureau_id: bureauId,
            role: accessType === 'Directeur' ? 'Directeur' : 'Vagmeustre',
            service: accessType === 'Vaguemestre' ? targetService.trim() : '',
            status: 'approved',
            bureau_name: token // We store the base64 token here to easily retrieve it later
          }
        }
      });

      if (signUpError && signUpError.message !== 'Failed to fetch') {
        throw new Error(`Erreur: ${signUpError.message}`);
      }
      
      setGeneratedLink(link);
      
      // Refresh the list of active links
      setTimeout(fetchActiveLinks, 1000); // Small delay to let trigger finish

    } catch (error: any) {
      console.error('Error generating vaguemestre link:', error);
      alert('Erreur lors de la génération du lien : ' + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyExisting = (token: string) => {
    const link = `${window.location.origin}/shared-login?t=${token}`;
    navigator.clipboard.writeText(link);
    alert('Lien copié dans le presse-papier !');
  };

  const handleRevokeLink = async (profileId: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir révoquer l'accès pour "${name}" ? Ce lien deviendra immédiatement inactif.`)) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'rejected' })
          .eq('id', profileId);
        
        if (error) throw error;
        
        // Refresh list
        fetchActiveLinks();
      } catch (err: any) {
        console.error('Error revoking link:', err);
        alert('Erreur lors de la révocation du lien : ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100 mt-8">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center mr-4">
            <Link2 className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Accès Rapide et Partages</h3>
            <p className="text-sm text-gray-500">Générez un lien direct permettant à un personnel spécifique de consulter les dossiers sans créer de compte complet.</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start">
          <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Ces liens permettent à d'autres de se connecter instantanément à un portail de recherche simplifié.
            Vous pouvez générer autant de liens que vous le souhaitez pour les partager à différentes personnes.
            <span className="font-bold block mt-1">Ne partagez ces liens qu'avec le personnel autorisé.</span>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Type d'accès à générer</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col transition-all ${accessType === 'Vaguemestre' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
              <div className="flex items-center mb-2">
                <input 
                  type="radio" 
                  name="accessType" 
                  checked={accessType === 'Vaguemestre'} 
                  onChange={() => setAccessType('Vaguemestre')}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                />
                <span className={`ml-2 font-bold ${accessType === 'Vaguemestre' ? 'text-orange-900' : 'text-gray-700'}`}>Vaguemestre (Restreint)</span>
              </div>
              <p className="text-xs text-gray-500 ml-6">Accès en lecture limité uniquement aux dossiers d'un service spécifique.</p>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col transition-all ${accessType === 'Directeur' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
              <div className="flex items-center mb-2">
                <input 
                  type="radio" 
                  name="accessType" 
                  checked={accessType === 'Directeur'} 
                  onChange={() => setAccessType('Directeur')}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                />
                <span className={`ml-2 font-bold ${accessType === 'Directeur' ? 'text-orange-900' : 'text-gray-700'}`}>Directeur (Complet)</span>
              </div>
              <p className="text-xs text-gray-500 ml-6">Accès en lecture à l'intégralité des dossiers enregistrés de votre bureau.</p>
            </label>
          </div>
        </div>

        {accessType === 'Vaguemestre' && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2">
            <label htmlFor="targetService" className="block text-sm font-bold text-gray-700 mb-2">Service concerné (Obligatoire)</label>
          
          <div className="relative" ref={dropdownRef}>
            <div 
              className={`block w-full rounded-xl border-gray-300 shadow-sm sm:text-sm py-3 px-4 border bg-white ${
                loading || !!generatedLink || loadingServices ? 'bg-gray-50 cursor-not-allowed opacity-75' : 'cursor-pointer hover:border-blue-400'
              }`}
              onClick={() => !(loading || !!generatedLink || loadingServices) && setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="flex items-center justify-between">
                <span className={targetService ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  {targetService || "Sélectionnez ou recherchez un service..."}
                </span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            {isDropdownOpen && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-gray-100 bg-gray-50/80">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Tapez pour filtrer les services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto overflow-x-hidden p-2">
                  {filteredServices.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500 text-center flex flex-col items-center">
                      <Search className="h-6 w-6 text-gray-300 mb-2" />
                      Aucun service correspondant trouvé
                    </div>
                  ) : (
                    filteredServices.map(service => (
                      <div
                        key={service}
                        className={`px-4 py-2.5 my-0.5 rounded-lg text-sm cursor-pointer transition-colors flex justify-between items-center ${
                          targetService === service 
                            ? 'bg-blue-50 text-blue-700 font-bold' 
                            : 'text-gray-700 hover:bg-gray-100 font-medium'
                        }`}
                        onClick={() => {
                          setTargetService(service);
                          setIsDropdownOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        {service}
                        {targetService === service && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {loadingServices && <p className="text-xs text-blue-500 mt-2 font-medium animate-pulse">Chargement et optimisation de la liste des services...</p>}
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            La liste ci-dessus contient les services actifs (expéditeurs ou orientations) déjà enregistrés dans vos dossiers.<br/>
            Le vaguemestre ne pourra voir que les dossiers où l'Orientation ou l'Expéditeur correspond à ce service exact.
          </p>
        </div>
        )}

        {!generatedLink ? (
          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="inline-flex items-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-orange-700 transition-all disabled:bg-orange-300 transform hover:-translate-y-0.5"
          >
            {loading ? 'Génération...' : 'Générer le lien d\'accès'}
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              {accessType === 'Directeur' ? 'Lien Directeur généré' : 'Lien Vaguemestre généré'} (à copier)
            </label>
            <div className="flex">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="block w-full rounded-l-xl border-gray-200 bg-gray-50 shadow-sm sm:text-sm border py-3 px-4 text-gray-600 font-medium cursor-text"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center rounded-r-xl bg-gray-100 px-4 py-3 text-sm font-bold border border-l-0 border-gray-200 hover:bg-gray-200 transition-colors text-gray-700"
              >
                {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <button
               onClick={() => {
                 setGeneratedLink('');
                 setTargetService('');
               }}
               className="text-sm font-bold text-orange-600 hover:text-orange-800 transition-colors mt-2 underline"
            >
               Générer un autre lien
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Liste des liens actifs */}
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="px-6 py-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Link2 className="h-5 w-5 text-gray-500 mr-2" />
            Liens Partagés Actifs
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {activeLinks.length} lien(s)
          </span>
        </div>
        
        <div className="p-0">
          {loadingLinks ? (
            <div className="p-8 text-center text-gray-500 animate-pulse text-sm font-medium">Chargement des liens actifs...</div>
          ) : activeLinks.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <Link2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Aucun lien d'accès partagé n'est actuellement actif.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activeLinks.map((link) => (
                <li key={link.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        link.role === 'Directeur' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {link.role}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{link.full_name}</span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <span className="font-semibold mr-1">Créé le :</span>
                      {new Date(link.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyExisting(link.requested_bureau_name)}
                      className="inline-flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                      title="Copier le lien"
                    >
                      <Copy className="h-4 w-4 mr-2 text-gray-400" />
                      Copier
                    </button>
                    <button
                      onClick={() => handleRevokeLink(link.id, link.full_name)}
                      className="inline-flex items-center px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
                      title="Révoquer ce lien"
                    >
                      Révoquer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Users, FileText, Search, ExternalLink, Plus, X, FolderTree } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BureausList = () => {
  const { role, organizationId, organizationName } = useAuth();
  const [bureaus, setBureaus] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBureau, setNewBureau] = useState({ 
    name: '', 
    email: '', 
    isNewOrg: false, 
    newOrgName: '', 
    existingOrgId: '' 
  });

  const fetchBureaus = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bureaus')
        .select(`
          *,
          organizations(name),
          profiles(count),
          dossiers(count)
        `);

      if (role !== 'Super_admin' && organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const [{ data, error }, { data: orgsData }] = await Promise.all([
        query,
        role === 'Super_admin' ? supabase.from('organizations').select('*') : Promise.resolve({ data: [] })
      ]);

      if (error) throw error;
      setBureaus(data || []);
      if (orgsData) {
        setOrganizations(orgsData);
      }
    } catch (error) {
      console.error('Error fetching bureaus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBureau = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetOrgId = organizationId;

    try {
      if (role === 'Super_admin') {
        if (newBureau.isNewOrg) {
          if (!newBureau.newOrgName.trim()) {
            alert('Veuillez entrer un nom pour la nouvelle organisation.');
            return;
          }
          const { data: createdOrg, error: orgError } = await supabase
            .from('organizations')
            .insert([{ name: newBureau.newOrgName }])
            .select()
            .single();
            
          if (orgError) throw orgError;
          targetOrgId = createdOrg.id;
        } else {
          targetOrgId = newBureau.existingOrgId;
        }
      }

      if (!newBureau.name.trim() || !targetOrgId) {
         if(role === 'Super_admin') alert('Veuillez sélectionner ou créer une organisation.');
         return;
      }

      const { error } = await supabase
        .from('bureaus')
        .insert([{
          name: newBureau.name,
          email: newBureau.email,
          organization_id: targetOrgId
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setNewBureau({ name: '', email: '', isNewOrg: false, newOrgName: '', existingOrgId: '' });
      fetchBureaus();
    } catch (error) {
      console.error('Error creating bureau:', error);
      alert('Erreur lors de la création du bureau ou de l\'organisation.');
    }
  };

  useEffect(() => {
    if (role === 'Super_admin' || role === 'admin') {
      fetchBureaus();
    }
  }, [role, organizationId]);

  const filteredBureaus = bureaus.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.organizations?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBureaus = filteredBureaus.reduce((acc, bureau) => {
    const orgName = bureau.organizations?.name || 'Organisation non assignée';
    if (!acc[orgName]) acc[orgName] = [];
    acc[orgName].push(bureau);
    return acc;
  }, {} as Record<string, any[]>);

  if (role !== 'Super_admin' && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Accès restreint</h2>
        <p className="mt-2 text-gray-600">Seuls les administrateurs peuvent gérer les bureaux.</p>
      </div>
    );
  }

  const BureauCard = ({ bureau }: { bureau: any }) => (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all overflow-hidden group transform hover:-translate-y-1">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-all duration-300">
            <Building2 className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {bureau.id.substring(0, 8)}</span>
        </div>
        {role !== 'Super_admin' && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {bureau.organizations?.name || 'Indépendante'}
            </span>
          </div>
        )}
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
      <div className="bg-gray-50/50 px-8 py-4 flex justify-end border-t border-gray-50">
        <button className="text-blue-600 hover:text-blue-700 text-xs font-black uppercase tracking-widest inline-flex items-center transition-colors">
          Gérer <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {role === 'Super_admin' ? 'Organisations & Directions' : `Espaces de Travail - ${organizationName}`}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {role === 'Super_admin' 
              ? 'Gérez la hiérarchie des organisations et de leurs directions rattachées.' 
              : 'Gérez les directions et services rattachés à votre organisation.'}
          </p>
        </div>
        {(role === 'Super_admin' || role === 'admin') && (
          <div className="mt-4 sm:ml-16 sm:mt-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all transform hover:scale-105"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter une Direction
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)} />
            <div className="relative transform overflow-hidden rounded-3xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-8">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-xl font-black text-gray-900 leading-6 mb-1">
                    {role === 'Super_admin' ? 'Nouvelle Direction / Organisation' : 'Ajouter une Direction'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">Créez un nouvel espace de travail pour l'organisation.</p>
                  
                  <form onSubmit={handleCreateBureau} className="space-y-4">
                    {role === 'Super_admin' && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-3">Organisation Parent</label>
                        <div className="flex items-center space-x-4 mb-3">
                          <label className="flex items-center text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              checked={!newBureau.isNewOrg} 
                              onChange={() => setNewBureau({...newBureau, isNewOrg: false})}
                              className="text-blue-600 focus:ring-blue-500 mr-2"
                            />
                            Organisation Existante
                          </label>
                          <label className="flex items-center text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              checked={newBureau.isNewOrg} 
                              onChange={() => setNewBureau({...newBureau, isNewOrg: true})}
                              className="text-blue-600 focus:ring-blue-500 mr-2"
                            />
                            Nouvelle Organisation
                          </label>
                        </div>

                        {!newBureau.isNewOrg ? (
                          <select
                            required
                            className="block w-full rounded-xl border-gray-200 py-3 text-gray-900 border transition-all px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={newBureau.existingOrgId}
                            onChange={(e) => setNewBureau({ ...newBureau, existingOrgId: e.target.value })}
                          >
                            <option value="">Sélectionnez une organisation...</option>
                            {organizations.map(org => (
                              <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            className="block w-full rounded-xl border-gray-200 py-3 text-gray-900 border transition-all px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={newBureau.newOrgName}
                            onChange={(e) => setNewBureau({ ...newBureau, newOrgName: e.target.value })}
                            placeholder="Nom de la nouvelle organisation"
                          />
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom de la Direction / Bureau</label>
                      <input
                        type="text"
                        required
                        className="block w-full rounded-xl border-gray-200 py-3 text-gray-900 border transition-all px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={newBureau.name}
                        onChange={(e) => setNewBureau({ ...newBureau, name: e.target.value })}
                        placeholder="Ex: Direction Financière"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email de contact (Optionnel)</label>
                      <input
                        type="email"
                        className="block w-full rounded-xl border-gray-200 py-3 text-gray-900 border transition-all px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={newBureau.email}
                        onChange={(e) => setNewBureau({ ...newBureau, email: e.target.value })}
                        placeholder="contact@direction.com"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 transition-all"
                      >
                        Créer la Direction
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher une direction ou organisation..."
            className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:ring-blue-500 border transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-3xl h-56 shadow-xl border border-gray-100"></div>
          ))}
        </div>
      ) : filteredBureaus.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl shadow-sm border border-dashed border-gray-200">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium italic">Aucun espace de travail trouvé.</p>
        </div>
      ) : (
        role === 'Super_admin' ? (
          <div className="space-y-12">
            {Object.entries(groupedBureaus).map(([orgName, orgBureaus]) => (
              <div key={orgName} className="bg-white/50 rounded-3xl p-6 border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mr-4">
                    <FolderTree className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{orgName}</h2>
                  <span className="ml-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-lg">
                    {orgBureaus.length} Direction(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 pl-14">
                  {orgBureaus.map(bureau => (
                    <BureauCard key={bureau.id} bureau={bureau} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBureaus.map(bureau => (
              <BureauCard key={bureau.id} bureau={bureau} />
            ))}
          </div>
        )
      )}
    </div>
  );
};


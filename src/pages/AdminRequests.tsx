import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Check, X, Building2, Mail, Clock, Users } from 'lucide-react';

export const AdminRequests = () => {
  const { role } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch profiles that are pending validation
      const { data: pendingProfiles, error } = await supabase
        .from('profiles')
        .select('*, bureaus(name), organizations(name)')
        .eq('status', 'pending');

      if (error) {
        console.error('Supabase query error (AdminRequests):', error);
        throw error;
      }
      
      const enrichedRequests = (pendingProfiles || []).map(p => ({
        ...p,
        bureau_name: p.bureaus ? p.bureaus.name : (p.requested_bureau_name || 'Bureau inconnu'),
        organization_name: p.organizations ? p.organizations.name : (p.requested_organization_name || 'Organisation inconnue')
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (req: any) => {
    const id = req.id;
    let requestedBureauName = req.requested_bureau_name || req.bureau_name;
    let requestedOrgName = req.requested_organization_name || req.organization_name;

    console.log('Tentative d\'approbation pour:', req);

    if (!requestedOrgName || requestedOrgName === 'Organisation inconnue') {
      const manualOrg = window.prompt('Le nom de l\'organisation est manquant. Veuillez le saisir :', '');
      if (!manualOrg || manualOrg.trim() === '') {
        alert('Erreur : Un nom d\'organisation est obligatoire.');
        return;
      }
      requestedOrgName = manualOrg.trim();
    }

    if (!requestedBureauName || requestedBureauName === 'Bureau inconnu') {
      const manualName = window.prompt('Le nom du bureau est manquant. Veuillez le saisir :', '');
      if (!manualName || manualName.trim() === '') {
        alert('Erreur : Un nom de bureau est obligatoire.');
        return;
      }
      requestedBureauName = manualName.trim();
    }

    try {
      setLoading(true);
      
      // 1. Check if organization exists or create it
      let finalOrgId = null;
      const { data: existingOrg, error: orgSearchError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', requestedOrgName)
        .maybeSingle();

      if (orgSearchError) throw orgSearchError;

      if (existingOrg) {
        finalOrgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert([{ name: requestedOrgName }])
          .select()
          .single();
        if (orgError) throw orgError;
        finalOrgId = newOrg.id;
      }

      // 2. Check if bureau exists or create it
      let finalBureauId = null;
      const { data: existingBureau, error: searchError } = await supabase
        .from('bureaus')
        .select('id')
        .eq('name', requestedBureauName)
        .eq('organization_id', finalOrgId)
        .maybeSingle();
      
      if (searchError) throw searchError;
      
      if (existingBureau) {
        finalBureauId = existingBureau.id;
      } else {
        const { data: newBureau, error: bureauError } = await supabase
          .from('bureaus')
          .insert([{ name: requestedBureauName, organization_id: finalOrgId }])
          .select()
          .single();
        
        if (bureauError) throw bureauError;
        finalBureauId = newBureau.id;
      }

      // 3. Approve user and link to both
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          status: 'approved', 
          role: 'admin',
          bureau_id: finalBureauId,
          organization_id: finalOrgId
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      alert('Demande approuvée avec succès !');
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert('Erreur lors de la validation : ' + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) throw error;
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'Super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <X className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Accès restreint</h2>
        <p className="mt-2 text-gray-600">Seul le Super Administrateur peut valider les nouveaux bureaux.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Demandes d'inscription</h1>
          <p className="mt-2 text-sm text-gray-600">
            Validez les demandes de création de bureaux pour activer les nouveaux comptes administrateurs.
          </p>
        </div>
      </div>

      <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Organisation / Demandeur</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                      <span className="text-sm font-bold text-gray-500">Chargement des demandes...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-gray-200 mb-4" />
                      <p className="text-gray-500 font-medium italic">Aucune demande en attente de validation.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-black text-gray-900 tracking-tight">{req.organization_name}</div>
                          <div className="text-xs font-bold text-blue-600 mt-0.5">{req.bureau_name}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{req.full_name || 'Sans nom'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-300" />
                        {req.email}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-50 text-yellow-700 border border-yellow-100">
                        <Clock className="mr-1.5 h-3 w-3" />
                        En attente
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 transition-all transform hover:-translate-y-0.5 disabled:bg-green-400"
                        >
                          <Check className="h-4 w-4 mr-1.5" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
                        >
                          <X className="h-4 w-4 mr-1.5" />
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

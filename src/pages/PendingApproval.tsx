import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Clock, LogOut, Mail, RefreshCw } from 'lucide-react';

export const PendingApproval = () => {
  const { signOut, user, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
    
    // Check local storage or wait for rerender - but we can just let App.tsx handle it when userProfile is updated by refreshProfile
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-2xl text-center border border-gray-100">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-50 shadow-inner border border-yellow-100">
          <Clock className="h-10 w-10 text-yellow-600" />
        </div>
        <div>
          <h2 className="mt-6 text-3xl font-black text-gray-900 tracking-tight">Compte en attente</h2>
          <p className="mt-4 text-gray-600 font-medium">
            Merci pour votre inscription, <span className="font-black text-blue-600">{user?.full_name}</span>.
          </p>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Votre demande de création de bureau est actuellement en cours de révision par un administrateur système.
          </p>
          <div className="mt-8 rounded-2xl bg-blue-50 p-6 text-left border border-blue-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-blue-500" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Prochaine étape</h3>
                <div className="mt-2 text-sm text-blue-700 font-medium">
                  <p>
                    Une fois votre compte approuvé, vous recevrez un accès complet au tableau de bord SSD.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Vérifier le statut
          </button>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = '/';
            }}
            className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:-translate-y-0.5"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

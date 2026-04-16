import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Loader2 } from 'lucide-react';

export const SharedLogin = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    // If already logged in, redirect them
    if (session) {
      navigate('/dashboard');
      return;
    }

    const performLogin = async () => {
      try {
        if (!token) {
          throw new Error('Lien invalide ou expiré.');
        }

        // Decode token
        const decoded = atob(token);
        const [email, password] = decoded.split(':');

        if (!email || !password) {
          throw new Error('Lien corrompu.');
        }

        await login(email, password);
        navigate('/vaguemestre', { replace: true });

      } catch (err: any) {
        console.error('Shared login error:', err);
        setError(err.message || 'Impossible de se connecter avec ce lien.');
      }
    };

    performLogin();
  }, [token, login, navigate, session]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl border border-red-100 sm:px-10 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
               <span className="text-red-600 font-bold text-xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion échouée</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Retour à la connexion normale
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Connexion automatique en cours...</h2>
        <p className="text-gray-500 mt-2">Veuillez patienter pendant que nous sécurisons votre accès Vaguemestre.</p>
      </div>
    </div>
  );
};

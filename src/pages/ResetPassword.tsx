import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-2xl text-center border border-gray-100">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-green-50 shadow-inner border border-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="mt-6 text-3xl font-black text-gray-900 tracking-tight">Mot de passe modifié !</h2>
          <p className="mt-4 text-gray-600 font-medium leading-relaxed">
            Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.
          </p>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-blue-600 tracking-tighter">SSD</h1>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Nouveau mot de passe
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Définissez votre nouveau mot de passe sécurisé.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleResetPassword}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nouveau mot de passe
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Confirmer le mot de passe
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mise à jour...
                  </span>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Réinitialiser le mot de passe
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

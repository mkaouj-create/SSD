import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('Starting login process for:', email);

    try {
      console.log('Calling auth.login...');
      await login(email, password);
      console.log('Login successful, navigating to dashboard...');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error caught:', err);
      let errorMessage = err.message || 'Identifiants invalides ou problème de connexion';
      if (errorMessage === 'Invalid login credentials') {
        errorMessage = 'Email ou mot de passe incorrect.';
      }
      setError(errorMessage);
    } finally {
      console.log('Login process finally block reached.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-blue-600 tracking-tighter">SSD</h1>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Bon retour !
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Connectez-vous pour gérer vos dossiers.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email-address" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <Link to="/forgot-password" title="Réinitialiser le mot de passe" className="text-xs font-bold text-blue-600 hover:text-blue-500">
                    Oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    Connexion...
                  </span>
                ) : 'Se connecter'}
              </button>
            </div>
            
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Pas encore de bureau ?{' '}
                <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
                  Créer un compte
                </Link>
              </p>
            </div>
          </form>
        </div>
        
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

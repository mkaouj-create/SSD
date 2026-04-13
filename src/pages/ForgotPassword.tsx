import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la demande de réinitialisation');
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
          <h2 className="mt-6 text-3xl font-black text-gray-900 tracking-tight">Email envoyé !</h2>
          <p className="mt-4 text-gray-600 font-medium leading-relaxed">
            Si un compte existe pour <span className="font-black text-blue-600">{email}</span>, vous recevrez un lien de réinitialisation sous peu.
          </p>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
            >
              Retour à la connexion
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
              Mot de passe oublié ?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleResetRequest}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}
            
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
                    Envoi en cours...
                  </span>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Envoyer le lien
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

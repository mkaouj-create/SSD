import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowLeft, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [bureauName, setBureauName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inviteData, setInviteData] = useState<{ b: string, r: string } | null>(null);

  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(invite))));
        setInviteData(decoded);
      } catch (e) {
        console.error('Invalid invitation link');
      }
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Add a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Délai d'attente dépassé.")), 15000);
      });

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            bureau_id: inviteData?.b || undefined,
            organization_id: searchParams.get('org') || undefined,
            role: inviteData?.r || undefined,
            organization_name: inviteData ? undefined : organizationName,
            bureau_name: inviteData ? undefined : bureauName,
            status: inviteData ? 'approved' : 'pending' // Auto-approve invited users
          }
        }
      });

      // 1. Create the user in Supabase Auth
      const { data, error: signUpError } = await Promise.race([signUpPromise, timeoutPromise]) as any;

      if (signUpError) {
        console.error('Supabase SignUp Error:', signUpError);
        if (signUpError.message === 'Failed to fetch') {
          throw new Error("Erreur réseau : Impossible de joindre le serveur. Cela est souvent dû à une limite de sécurité (trop de comptes créés), à un bloqueur de publicités, ou à un projet en veille.");
        }
        throw signUpError;
      }

      if (data.user) {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Detailed Registration Error:', err);
      let errorMessage = err.message;
      if (!errorMessage || errorMessage === 'null') {
        errorMessage = 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl text-center transform transition-all">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 shadow-inner">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            {inviteData ? 'Inscription terminée !' : 'Demande envoyée !'}
          </h2>
          <div className="mt-4 space-y-4 text-gray-600">
            <p className="text-lg">
              {inviteData 
                ? "Votre compte a été créé avec succès. Vous pouvez maintenant accéder au système."
                : <>Votre demande de création pour le bureau <span className="font-bold text-blue-600">"{bureauName}"</span> a été enregistrée.</>
              }
            </p>
            <p className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-100">
              {inviteData 
                ? "Connectez-vous pour commencer à gérer vos dossiers d'arrivée."
                : "Un administrateur va examiner votre demande. Vous recevrez un accès dès que votre bureau sera validé."
              }
            </p>
          </div>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            >
              Aller à la page de connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left side - Info */}
          <div className="hidden md:flex md:w-1/3 bg-blue-600 p-8 flex-col justify-between text-white">
            <div>
              <h1 className="text-4xl font-bold">SSD</h1>
              <p className="mt-4 text-blue-100 text-sm">
                Système de Suivi des Dossiers multi-bureaux.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-300"></div>
                <span>Multi-tenant sécurisé</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-300"></div>
                <span>Suivi en temps réel</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-300"></div>
                <span>Gestion des rôles</span>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex-1 p-8 sm:p-10">
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-6 transition-colors">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour
              </Link>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {inviteData ? 'Rejoindre un bureau' : 'Créer un bureau'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {inviteData 
                  ? `Vous avez été invité à rejoindre un bureau en tant que ${inviteData.r}.`
                  : 'Remplissez les informations pour enregistrer votre organisation.'
                }
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleRegister}>
              {error && (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 animate-pulse">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1">
                  <label htmlFor="full-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Votre Nom Complet
                  </label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="full-name"
                      name="fullName"
                      type="text"
                      required
                      className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                      placeholder="Jean Dupont"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                {!inviteData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="organization-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Nom de l'Organisation
                      </label>
                      <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Building2 className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          id="organization-name"
                          name="organizationName"
                          type="text"
                          required
                          className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                          placeholder="Ex: Ministère de la Justice"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="bureau-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Nom du 1er Bureau
                      </label>
                      <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Building2 className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          id="bureau-name"
                          name="bureauName"
                          type="text"
                          required
                          className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                          placeholder="Ex: Secrétariat Central"
                          value={bureauName}
                          onChange={(e) => setBureauName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="email-address" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email Professionnel
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
                      placeholder="admin@organisation.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="block w-full rounded-xl border-gray-200 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
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
                      Traitement...
                    </span>
                  ) : 'Créer mon bureau'}
                </button>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500">
                  Déjà un compte ?{' '}
                  <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
                    Se connecter
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

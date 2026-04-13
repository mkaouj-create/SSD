import { Link, Navigate } from 'react-router-dom';
import { Shield, Activity, Users, Bell, ArrowRight, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export const Landing = () => {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md fixed w-full z-50 top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SSD
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                >
                  Mon Espace
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  >
                    Créer un bureau
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white"></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Système de Suivi</span>
            <span className="block text-blue-600">des Dossiers</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            La plateforme centralisée pour gérer, suivre et collaborer sur tous vos dossiers administratifs en temps réel. Sécurisé, rapide et multi-bureaux.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              to={session ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3.5 text-base font-medium text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
            >
              Accéder à mon espace
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Tout ce dont vous avez besoin pour gérer vos flux
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Une suite complète d'outils conçue pour les administrations et les entreprises.
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="mt-8 text-lg font-semibold text-gray-900">Traçabilité totale</h3>
              <p className="mt-2 text-sm text-gray-600">
                Historique complet des actions, des transmissions et des changements de statut pour chaque dossier.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-8 text-lg font-semibold text-gray-900">Sécurité & Rôles</h3>
              <p className="mt-2 text-sm text-gray-600">
                Gestion fine des permissions. Les données sont isolées par bureau (Multi-tenant) pour une confidentialité absolue.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-8 text-lg font-semibold text-gray-900">Collaboration</h3>
              <p className="mt-2 text-sm text-gray-600">
                Ajoutez des commentaires internes, mentionnez vos collègues et travaillez ensemble plus efficacement.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mt-8 text-lg font-semibold text-gray-900">Notifications</h3>
              <p className="mt-2 text-sm text-gray-600">
                Soyez alerté en temps réel lors de l'assignation d'un nouveau dossier ou d'une mise à jour importante.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SSD
            </span>
            <span className="ml-2 text-sm text-gray-500">© 2026 Système de Suivi des Dossiers.</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">Confidentialité</a>
            <a href="#" className="hover:text-gray-900">Conditions</a>
            <a href="#" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

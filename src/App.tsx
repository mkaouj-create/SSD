import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DossiersList } from './pages/DossiersList';
import { DossierDetails } from './pages/DossierDetails';
import { NewDossier } from './pages/NewDossier';
import { EditDossier } from './pages/EditDossier';
import { UsersList } from './pages/UsersList';
import { Settings } from './pages/Settings';
import { Roles } from './pages/Roles';
import { AdminRequests } from './pages/AdminRequests';
import { BureausList } from './pages/BureausList';
import { PendingApproval } from './pages/PendingApproval';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Layout } from './components/Layout';
import { SharedLogin } from './pages/SharedLogin';
import { VaguemestrePortal } from './pages/VaguemestrePortal';
import { Chat } from './pages/Chat';
import { Statistics } from './pages/Statistics';

import { AuditLogs } from './pages/AuditLogs';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading, status, user } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.is_active === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-2xl font-bold text-red-600">Compte désactivé</h2>
        <p className="mt-2 text-gray-600">Votre compte a été temporairement désactivé par l'administrateur de votre bureau.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-4 text-blue-600 hover:underline"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // If user profile is missing or status is pending, show pending page
  if (!user || status === 'pending') {
    return <PendingApproval />;
  }

  if (status === 'rejected') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-2xl font-bold text-red-600">Compte refusé</h2>
        <p className="mt-2 text-gray-600">Votre demande d'accès a été refusée par l'administrateur.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-4 text-blue-600 hover:underline"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/shared-login" element={<SharedLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/vaguemestre" element={
            <ProtectedRoute>
              <VaguemestrePortal />
            </ProtectedRoute>
          } />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dossiers" element={<DossiersList />} />
            <Route path="/dossiers/new" element={<NewDossier />} />
            <Route path="/dossiers/:id" element={<DossierDetails />} />
            <Route path="/dossiers/:id/edit" element={<EditDossier />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin-requests" element={<AdminRequests />} />
            <Route path="/bureaus" element={<BureausList />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

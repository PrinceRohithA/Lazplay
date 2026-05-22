import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import DeveloperDashboard from './pages/DeveloperDashboard';
import GameDetails from './pages/GameDetails';
import Home from './pages/Home';
import Register from './pages/Register';
import GameLibrary from './pages/GameLibrary';
import GamesDiscovery from './pages/GamesDiscovery';
import DeveloperDeployment from './pages/DeveloperDeployment';
import Settings from './pages/Settings';
import DownloadLauncher from './pages/DownloadLauncher';
import Profile from './pages/Profile';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import Layout from './components/Layout';

const isInsideLauncher = typeof window !== 'undefined' && !!window.electron;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={isInsideLauncher ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={isInsideLauncher ? <Navigate to="/" replace /> : <Register />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="game" element={<GameDetails />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="developer" element={<DeveloperDashboard />} />
          <Route path="library" element={<GameLibrary />} />
          <Route path="games" element={<GamesDiscovery />} />
          <Route path="options" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="deployment" element={<DeveloperDeployment />} />
          <Route path="download-launcher" element={<DownloadLauncher />} />
          <Route path="terms-and-conditions" element={<TermsOfService />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

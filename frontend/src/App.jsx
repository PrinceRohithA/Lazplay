import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminMainframe from './pages/AdminMainframe';
import SystemLoginCyberEdition from './pages/SystemLoginCyberEdition';
import DeveloperWorkspace from './pages/DeveloperWorkspace';
import GameDetailsSteamStyleLayout from './pages/GameDetailsSteamStyleLayout';
import PlayerDiscoveryHub from './pages/PlayerDiscoveryHub';
import UserRegistrationCyberEdition from './pages/UserRegistrationCyberEdition';
import GameLibraryCyberEdition from './pages/GameLibraryCyberEdition';
import GamesDiscoveryRetroEdition from './pages/GamesDiscoveryRetroEdition';
import DeveloperWorkspaceAdvancedDeploymentSuite from './pages/DeveloperWorkspaceAdvancedDeploymentSuite';
import Options from './pages/Options';
import LauncherDownloadPage from './pages/LauncherDownloadPage';
import Layout from './components/Layout';

const isInsideLauncher = typeof window !== 'undefined' && !!window.electron;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={isInsideLauncher ? <Navigate to="/" replace /> : <SystemLoginCyberEdition />} />
        <Route path="/signup" element={isInsideLauncher ? <Navigate to="/" replace /> : <UserRegistrationCyberEdition />} />
        <Route element={<Layout />}>
          <Route index element={<PlayerDiscoveryHub />} />
          <Route path="game" element={<GameDetailsSteamStyleLayout />} />
          <Route path="admin" element={<AdminMainframe />} />
          <Route path="developer" element={<DeveloperWorkspace />} />
          <Route path="library" element={<GameLibraryCyberEdition />} />
          <Route path="games" element={<GamesDiscoveryRetroEdition />} />
          <Route path="options" element={<Options />} />
          <Route path="deployment" element={<DeveloperWorkspaceAdvancedDeploymentSuite />} />
          <Route path="download-launcher" element={<LauncherDownloadPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

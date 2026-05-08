import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminMainframe from './pages/AdminMainframe';
import SystemLoginCyberEdition from './pages/SystemLoginCyberEdition';
import DeveloperWorkspace from './pages/DeveloperWorkspace';
import GameDetailsSteamStyleLayout from './pages/GameDetailsSteamStyleLayout';
import PlayerDiscoveryHub from './pages/PlayerDiscoveryHub';
import UserRegistrationCyberEdition from './pages/UserRegistrationCyberEdition';
import GameLibraryCyberEdition from './pages/GameLibraryCyberEdition';
import GamesDiscoveryRetroEdition from './pages/GamesDiscoveryRetroEdition';
import DeveloperWorkspaceAdvancedDeploymentSuite from './pages/DeveloperWorkspaceAdvancedDeploymentSuite';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<SystemLoginCyberEdition />} />
        <Route path="/signup" element={<UserRegistrationCyberEdition />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<PlayerDiscoveryHub />} />
              <Route path="/game" element={<GameDetailsSteamStyleLayout />} />
              <Route path="/admin" element={<AdminMainframe />} />
              <Route path="/developer" element={<DeveloperWorkspace />} />
              <Route path="/library" element={<GameLibraryCyberEdition />} />
              <Route path="/games" element={<GamesDiscoveryRetroEdition />} />
              <Route path="/deployment" element={<DeveloperWorkspaceAdvancedDeploymentSuite />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;

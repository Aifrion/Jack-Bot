import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Play } from './pages/Play';
import { Results } from './pages/Results';
import { Host } from './pages/Host';
import { HostRoom } from './pages/HostRoom';
import { SocketProvider } from './context/SocketContext';
import './App.css';

function GameRoutesLayout() {
  return (
    <SocketProvider>
      <Outlet />
    </SocketProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<GameRoutesLayout />}>
          <Route path="/lobby/:code" element={<Lobby />} />
          <Route path="/play/:code" element={<Play />} />
          <Route path="/results/:code" element={<Results />} />
        </Route>

        <Route path="/host" element={<Host />} />
        <Route path="/host/:code" element={<HostRoom />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

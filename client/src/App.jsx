import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PublicCapture from './pages/PublicCapture';
import Login from './pages/Login';
import AppShell from './pages/AppShell';
import Dashboard from './pages/Dashboard';
import LeadDetail from './pages/LeadDetail';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicCapture />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

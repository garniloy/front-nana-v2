// src/App.tsx — VERSION MISE À JOUR
// Ajout : fetchSubscription au chargement dès qu'un user est détecté
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Register from './view/Register';
import Login from './view/Login';
import AppDash from './view/AppDash';
import NotFound from './view/NotFound';
import Settings from './app/view/Settings';
import Subscription from './app/view/abonnement';
import SuperUser from './app/view/SuperUser';
import Forms from './app/view/Formulaire';
import Dashboard from './view/Dashboard';
import ChargeCashout from './app/components/Charge-cashout';
import ProdServManager from './app/components/ProdServManager';
import { useSubscriptionStore } from './hooks/useSubscriptionStore';

// Récupère le owner_id depuis le user stocké en session
function getStoredOwnerId(): string {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      return user.promoted_by || user.id || '';
    }
  } catch (_) {}
  return '';
}

function App() {
  const navigate = useNavigate();
  const { fetchSubscription } = useSubscriptionStore();

  // Dès que l'app charge, on vérifie l'abonnement si un user est connecté
  useEffect(() => {
    const owner_id = getStoredOwnerId();
    if (owner_id) {
      fetchSubscription(owner_id);
    }
  }, []);

  const handleLogin = () => {
    navigate('/app');
  };

  return (
    <Routes>
      <Route path='/' element={<Login onLogin={handleLogin} />} />
      <Route path='/register' element={<Register />} />
      <Route path='/login' element={<Login onLogin={handleLogin} />} />
      <Route path="/abonnement" element={<Subscription />} />
      <Route path='/app' element={<AppDash />}>
        <Route index element={<Forms />} />
        <Route path="formulaires" element={<Forms />} />
        <Route path="visualiseur-de-donnee" element={<ProdServManager />} />
        <Route path="parametres" element={<Settings />} />
        
        <Route path="super-utilisateur" element={<SuperUser />} />
        <Route path="charge-cashout" element={<ChargeCashout />} />
      </Route>
      <Route path='/dashboard' element={<Dashboard />} />
      <Route path='*' element={<NotFound />} />
    </Routes>
  );
}

export default App;
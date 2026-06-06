import { Routes, Route } from 'react-router-dom';
//import { useState } from 'react';

import Register from './view/Register';
import Login from './view/Login';
import AppDash from './view/AppDash';
import NotFound from './view/NotFound';
import Settings from './app/view/Settings';
import DataVisualizer from './app/view/DataViewe';
import Subscription from './app/view/abonnement';
import SuperUser from './app/view/SuperUser';
import Forms from './app/view/Formulaire';
import Dashboard from './view/Dashboard';
import { useNavigate } from 'react-router-dom';
import ChargeCashout from './app/components/Charge-cashout';
import ProdServManager from './app/components/ProdServManager';


function App() {
  const navigate = useNavigate();
  
  const handleLogin = ()=>{
    navigate('/app');
  }

  return (
    <Routes>
      <Route path='/' element={<Login onLogin={handleLogin} />} />
      <Route path='/register' element={<Register />} />
      <Route path='/login' element={<Login onLogin={handleLogin}/>} />
      <Route path='/app' element={<AppDash />}> 
        <Route index element={<Forms />} />
        <Route path="formulaires" element={<Forms />} />
        <Route path="visualiseur-de-donnee" element={<ProdServManager></ProdServManager>} />
        <Route path="parametres" element={<Settings />} />
        <Route path="abonnement" element={<Subscription />} />
        <Route path="super-utilisateur" element={<SuperUser />} />
        <Route path="charge-cashout" element={<ChargeCashout />} />
      </Route>
      <Route path='/dashboard' element={<Dashboard />} />
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export default App

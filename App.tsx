
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole } from './types';
import LandingPage from './pages/LandingPage';
import SystemGateway from './pages/SystemGateway';
import Login from './pages/Login';
import PublicBooking from './modules/booking/PublicBooking';
import BookingConfirmation from './modules/booking/BookingConfirmation';
import OwnerDashboard from './modules/management/OwnerDashboard';
import TeamManagement from './modules/management/TeamManagement';
import TeamMessages from './modules/management/TeamMessages';
import InventoryManagement from './modules/inventory/InventoryManagement';
import BarberCommand from './modules/checkout/BarberCommand';
import CashierCheckout from './modules/checkout/CashierCheckout';
import MasterDashboard from './modules/admin-master/MasterDashboard';
import GlobalCoupons from './modules/admin-master/GlobalCoupons';
import BarberCommissions from './modules/management/BarberCommissions';
import BarberSettings from './modules/management/BarberSettings';
import BarberHistory from './modules/management/BarberHistory';
import EstablishmentSettings from './modules/management/EstablishmentSettings';
import CommissionManagement from './modules/management/CommissionManagement';

// Componente para resetar o scroll em cada mudança de rota
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode; allowedRoles: UserRole[] }) => {
  const saved = localStorage.getItem('elite_user');
  const user = saved ? JSON.parse(saved) : null;
  
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/sistema" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [businessType, setBusinessType] = useState<'barber' | 'salon' >('barber');

  useEffect(() => {
    const saved = localStorage.getItem('elite_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user.businessType) setBusinessType(user.businessType);
    } else {
      const globalType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
      if (globalType) setBusinessType(globalType);
    }
  }, []);

  useEffect(() => {
    document.body.className = businessType === 'salon' ? 'theme-salon' : '';
    localStorage.setItem('elite_business_type', businessType);
  }, [businessType]);

  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage onSelectType={setBusinessType} />} />
        <Route path="/sistema" element={<SystemGateway />} />
        <Route path="/login" element={<Login type="standard" businessType={businessType} />} />
        <Route path="/login-master" element={<Login type="master" businessType={businessType} />} />
        
        <Route path="/:slug" element={<PublicBooking businessType={businessType} />} />
        <Route path="/:slug/confirmed" element={<BookingConfirmation />} />

        <Route path="/admin" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><OwnerDashboard businessType={businessType} /></ProtectedRoute>} />
        <Route path="/admin/equipe" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><TeamManagement businessType={businessType} /></ProtectedRoute>} />
        <Route path="/admin/mensagens" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><TeamMessages businessType={businessType} /></ProtectedRoute>} />
        <Route path="/admin/estoque" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><InventoryManagement businessType={businessType} /></ProtectedRoute>} />
        <Route path="/admin/caixa" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><CashierCheckout businessType={businessType} /></ProtectedRoute>} />
        <Route path="/admin/configuracoes" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><EstablishmentSettings businessType={businessType} /></ProtectedRoute>} />
        <Route path="/admin/comissoes" element={<ProtectedRoute allowedRoles={[UserRole.OWNER]}><CommissionManagement businessType={businessType} /></ProtectedRoute>} />

        <Route path="/profissional" element={<ProtectedRoute allowedRoles={[UserRole.BARBER, UserRole.OWNER]}><BarberCommand businessType={businessType} /></ProtectedRoute>} />
        <Route path="/profissional/comissoes" element={<ProtectedRoute allowedRoles={[UserRole.BARBER, UserRole.OWNER]}><BarberCommissions businessType={businessType} /></ProtectedRoute>} />
        <Route path="/profissional/historico" element={<ProtectedRoute allowedRoles={[UserRole.BARBER, UserRole.OWNER]}><BarberHistory businessType={businessType} /></ProtectedRoute>} />
        <Route path="/profissional/configuracao" element={<ProtectedRoute allowedRoles={[UserRole.BARBER, UserRole.OWNER]}><BarberSettings businessType={businessType} /></ProtectedRoute>} />

        <Route path="/admin-master" element={<ProtectedRoute allowedRoles={[UserRole.MASTER]}><MasterDashboard /></ProtectedRoute>} />
        <Route path="/admin-master/cupons" element={<ProtectedRoute allowedRoles={[UserRole.MASTER]}><GlobalCoupons /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;

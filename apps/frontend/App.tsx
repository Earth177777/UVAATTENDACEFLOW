import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Login from './views/Login';
import EmployeeDashboard from './views/EmployeeDashboard';
import SupervisorDashboard from './views/SupervisorDashboard';
import AdminDashboard from './views/AdminDashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import { Role } from './types';

// Apply saved theme immediately to prevent flash
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();


  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-20">
      <Header />
      <main className="pt-6">
        {currentUser.role === Role.EMPLOYEE && <EmployeeDashboard />}
        {currentUser.role === Role.SUPERVISOR && <SupervisorDashboard />}
        {currentUser.role === Role.ADMIN && <AdminDashboard />}
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;

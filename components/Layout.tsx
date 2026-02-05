
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarNavRef = useRef<HTMLElement>(null);
  
  const [user] = useState(() => {
    const saved = localStorage.getItem('elite_user');
    return saved ? JSON.parse(saved) : null;
  });

  const isSalon = document.body.classList.contains('theme-salon');

  // CONTROLE DE FONTE (ACESSIBILIDADE)
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('elite_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
    localStorage.setItem('elite_font_scale', String(fontScale));
  }, [fontScale]);

  const cycleFontScale = () => {
    if (fontScale === 1.0) setFontScale(1.15);
    else if (fontScale === 1.15) setFontScale(0.9);
    else setFontScale(1.0);
  };

  // MODO CLARO / ESCURO
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('elite_dark_mode');
    if (saved !== null) return saved === 'true';
    return !isSalon; 
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark-mode');
      html.classList.remove('light-mode');
    } else {
      html.classList.remove('dark-mode');
      html.classList.add('light-mode');
    }
    localStorage.setItem('elite_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // PERSISTÊNCIA DE SCROLL
  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem('elite_sidebar_scroll');
    if (sidebarNavRef.current && savedScroll) {
      sidebarNavRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [location.pathname]);

  const handleSidebarScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem('elite_sidebar_scroll', String(e.currentTarget.scrollTop));
  };

  // LOGOUT SEGURO
  const handleSystemLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.removeItem('elite_user');
    sessionStorage.removeItem('elite_sidebar_scroll');
    navigate('/login', { replace: true });
  };

  const menuItems = React.useMemo(() => {
    if (user?.role === UserRole.MASTER) return [
      { label: 'Painel Master', icon: 'dashboard', path: '/admin-master' },
      { label: 'Cupons Globais', icon: 'local_offer', path: '/admin-master/cupons' },
    ];
    
    if (user?.role === UserRole.OWNER) return [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
      { label: 'Caixa / Checkout', icon: 'point_of_sale', path: '/admin/caixa' },
      { label: 'Agenda Geral', icon: 'calendar_month', path: '/profissional' },
      { label: 'Comissões', icon: 'payments', path: '/admin/comissoes' },
      { label: 'Equipe', icon: 'group', path: '/admin/equipe' },
      { label: 'Mensagem', icon: 'chat_bubble', path: '/admin/mensagens' },
      { label: 'Estoque', icon: 'inventory_2', path: '/admin/estoque' },
      { label: 'Configurações', icon: 'settings', path: '/admin/configuracoes' },
    ];

    return [
      { label: 'Agenda Geral', icon: 'calendar_month', path: '/profissional' },
      { label: 'Comissões', icon: 'payments', path: '/profissional/comissoes' },
      { label: 'Histórico', icon: 'history', path: '/profissional/historico' },
      { label: 'Configuração', icon: 'settings', path: '/profissional/configuracao' },
    ];
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-background-deep flex text-text-main font-display">
      <aside className="w-64 border-r border-slate-500/10 flex flex-col bg-background-card/50 backdrop-blur-md sticky top-0 h-screen hidden md:flex shrink-0 z-50 overflow-hidden">
        <div className="p-8 pb-6 shrink-0">
          <h1 className="text-text-main text-2xl font-black italic tracking-tighter uppercase leading-none">
            FASTBEAUTY <span className="text-primary">PRO</span>
          </h1>
          <p className="text-primary font-display font-black tracking-[0.3em] text-[10px] uppercase opacity-80 mt-1">
            PLATAFORMA SAAS
          </p>
        </div>

        <nav 
          ref={sidebarNavRef}
          onScroll={handleSidebarScroll}
          className="flex-1 px-6 space-y-2 elite-nav-container custom-scrollbar pb-10 overflow-y-auto"
        >
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path}
                to={item.path}
                className={`elite-nav-item group ${isActive ? 'active' : 'hover:bg-primary/5'}`}
              >
                <span className="material-symbols-outlined text-[24px] mr-4">{item.icon}</span>
                <span className="text-sm tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-500/10 shrink-0 bg-background-card/80 relative z-[100]">
          <div className="p-4 bg-background-card border border-slate-500/10 rounded-[1.25rem] mb-6 shadow-inner pointer-events-none select-none">
            <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-1">
              {user?.role?.toUpperCase() || 'ACESSO'}
            </p>
            <p className="text-xs font-black truncate text-text-main">{user?.name || 'Membro FastBeauty'}</p>
          </div>
          
          <button 
            type="button"
            id="btn-logout-system"
            onClick={handleSystemLogout} 
            className="flex items-center gap-3 text-text-muted hover:text-red-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all w-full px-2 py-3 border border-transparent hover:border-red-400/10 rounded-xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            SAIR DO SISTEMA
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 border-b border-slate-500/10 flex items-center justify-between px-8 bg-background-card/30 backdrop-blur-md shrink-0 z-40">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none">{title}</h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1 opacity-60">Painel de Gestão</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center bg-background-card/50 rounded-full p-1 border border-slate-500/10 shadow-sm">
                <button onClick={cycleFontScale} className="size-10 rounded-full flex items-center justify-center text-text-muted hover:text-primary transition-all group" title="Alterar Tamanho da Fonte">
                    <span className="material-symbols-outlined text-[20px] font-bold">format_size</span>
                </button>
                <button onClick={toggleTheme} className="size-10 rounded-full flex items-center justify-center text-text-muted hover:text-primary transition-all group" title={isDarkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}>
                    <span className="material-symbols-outlined text-[22px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                </button>
             </div>
             <button className="size-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:scale-105 transition-all shadow-md">
                <span className="material-symbols-outlined text-[24px]">person</span>
             </button>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-background-deep/30">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;

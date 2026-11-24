import React, { useEffect, useState } from 'react';
import { IceCreamCone, LayoutGrid, History, Settings2, LogOut } from 'lucide-react';
import { api, getStoredToken, setOnUnauthorized, setStoredToken } from './api';
import type { User } from './types';
import { LoginScreen } from './components/LoginScreen';
import { BalcaoScreen } from './components/BalcaoScreen';
import { PedidoScreen } from './components/PedidoScreen';
import { HistoricoScreen } from './components/HistoricoScreen';
import { CadastrosScreen } from './components/CadastrosScreen';

type Page = 'balcao' | 'pedido' | 'historico' | 'cadastros';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [page, setPage] = useState<Page>('balcao');
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setPage('balcao');
      setSelectedPedidoId(null);
    });

    const token = getStoredToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setStoredToken(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  function handleLogout() {
    setStoredToken(null);
    setUser(null);
    setPage('balcao');
    setSelectedPedidoId(null);
  }

  function handleOpenPedido(id: number) {
    setSelectedPedidoId(id);
    setPage('pedido');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#d8ecff] to-[#bfe0ff] text-[#003377] font-semibold text-sm">
        Carregando sistema...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f4ff] via-[#dceeff] to-[#cde6ff] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#9bcbf8] sticky top-0 z-30 shadow-[0_4px_20px_-6px_rgba(0,82,180,0.14)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setPage('balcao');
                setSelectedPedidoId(null);
              }}
              className="flex items-center gap-2.5 text-[#003377] font-black tracking-tight cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#0a66cc] to-[#003f91] text-white flex items-center justify-center shadow-md shadow-blue-800/20">
                <IceCreamCone className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline text-lg">SORVETERIA PALÁCIO</span>
            </button>

            <nav className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPage('balcao');
                  setSelectedPedidoId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                  page === 'balcao' || page === 'pedido'
                    ? 'bg-gradient-to-r from-[#004ca8] to-[#0066cc] text-white shadow-sm shadow-blue-800/20'
                    : 'text-[#0c4a96] hover:bg-sky-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Balcão
              </button>
              <button
                type="button"
                onClick={() => setPage('historico')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                  page === 'historico'
                    ? 'bg-gradient-to-r from-[#004ca8] to-[#0066cc] text-white shadow-sm shadow-blue-800/20'
                    : 'text-[#0c4a96] hover:bg-sky-50'
                }`}
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
              <button
                type="button"
                onClick={() => setPage('cadastros')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                  page === 'cadastros'
                    ? 'bg-gradient-to-r from-[#004ca8] to-[#0066cc] text-white shadow-sm shadow-blue-800/20'
                    : 'text-[#0c4a96] hover:bg-sky-50'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Cadastros
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs font-semibold text-[#0c4a96] bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-full">
              Operador: <strong className="text-[#003377]">{user.nome}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-sky-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[#0c4a96] text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {page === 'balcao' && <BalcaoScreen onOpenPedido={handleOpenPedido} />}
        {page === 'pedido' && selectedPedidoId !== null && (
          <PedidoScreen
            pedidoId={selectedPedidoId}
            onBackToBalcao={() => {
              setSelectedPedidoId(null);
              setPage('balcao');
            }}
          />
        )}
        {page === 'historico' && <HistoricoScreen onOpenPedido={handleOpenPedido} />}
        {page === 'cadastros' && <CadastrosScreen />}
      </main>
    </div>
  );
}

export default App;

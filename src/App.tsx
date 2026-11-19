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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Carregando sistema...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setPage('balcao');
                setSelectedPedidoId(null);
              }}
              className="flex items-center gap-2.5 text-slate-900 font-extrabold tracking-tight cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <IceCreamCone className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline text-lg">SORVETERIA PDV</span>
            </button>

            <nav className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPage('balcao');
                  setSelectedPedidoId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  page === 'balcao' || page === 'pedido'
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Balcão
              </button>
              <button
                type="button"
                onClick={() => setPage('historico')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  page === 'historico'
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
              <button
                type="button"
                onClick={() => setPage('cadastros')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  page === 'cadastros'
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Cadastros
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs font-semibold text-slate-500">
              Operador: <strong className="text-slate-800">{user.nome}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-bold transition cursor-pointer"
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

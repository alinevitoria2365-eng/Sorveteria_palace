import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  Search,
  UserPlus,
  MessageSquare,
  UserCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import { api, formatCurrency, formatTime, STATUS_LABELS } from '../api';
import type { Atendente, Cliente, Pedido } from '../types';
import { PedidoScreen } from './PedidoScreen';

interface BalcaoScreenProps {
  onOpenPedido?: (pedidoId: number) => void;
}

export const BalcaoScreen: React.FC<BalcaoScreenProps> = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Painel direito: Novo Pedido ou Pedido Aberto no mesmo lugar
  const [showNovoPedido, setShowNovoPedido] = useState(true);
  const [activePedidoId, setActivePedidoId] = useState<number | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [atendenteId, setAtendenteId] = useState<number | ''>('');
  const [comentario, setComentario] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const clienteInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [pedidosData, clientesData, atendentesData] = await Promise.all([
        api.getPedidos('PENDENTE,EM_ANDAMENTO'),
        api.getClientes(),
        api.getAtendentes(),
      ]);
      setPedidos(pedidosData);
      setClientes(clientesData);
      setAtendentes(atendentesData);

      if (clientesData.length > 0 && selectedClienteId === '') {
        setSelectedClienteId(clientesData[0].id);
        setClienteSearch(clientesData[0].nome);
      }
      if (atendentesData.length > 0 && atendenteId === '') {
        setAtendenteId(atendentesData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do balcão.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendentes = useMemo(() => pedidos.filter((p) => p.status === 'PENDENTE'), [pedidos]);
  const emAndamento = useMemo(() => pedidos.filter((p) => p.status === 'EM_ANDAMENTO'), [pedidos]);

  const filteredClientes = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.telefone.toLowerCase().includes(q)
    );
  }, [clientes, clienteSearch]);

  function handleOpenNewOrderPanel() {
    setActivePedidoId(null);
    setShowNovoPedido(true);
    setFormError('');
    setTimeout(() => {
      clienteInputRef.current?.focus();
    }, 50);
  }

  async function handleQuickAddCliente() {
    const nome = clienteSearch.trim();
    if (!nome) return;
    try {
      const created = await api.createCliente(nome);
      setClientes((prev) => [...prev, created]);
      setSelectedClienteId(created.id);
      setClienteSearch(created.nome);
      setShowClienteDropdown(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar cliente.');
    }
  }

  async function handleAbrirPedido(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!selectedClienteId) {
      setFormError('Selecione um cliente.');
      return;
    }
    if (!atendenteId) {
      setFormError('Selecione um atendente.');
      return;
    }

    setCreating(true);
    try {
      const created = await api.createPedido({
        clienteId: Number(selectedClienteId),
        atendenteId: Number(atendenteId),
        comentario: comentario.trim(),
      });
      setComentario('');
      setActivePedidoId(created.id);
      setShowNovoPedido(true);
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao abrir pedido.');
    } finally {
      setCreating(false);
    }
  }

  function renderOrderTable(list: Pedido[], badgeClass: string) {
    if (loading && list.length === 0) {
      return (
        <div className="py-10 text-center text-sm text-slate-400">Carregando pedidos...</div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="py-10 text-center text-sm font-medium text-slate-400 tracking-wide">
          SEM VENDAS / PEDIDOS
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-sky-100 text-xs font-extrabold uppercase tracking-wider text-[#0c4a96] bg-sky-50/60">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">HORA</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4">CLIENTE</th>
              <th className="py-3 px-4 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100/80 text-sm">
            {list.map((pedido) => (
              <tr
                key={pedido.id}
                onClick={() => {
                  setActivePedidoId(pedido.id);
                  setShowNovoPedido(true);
                }}
                className={`hover:bg-sky-50/90 cursor-pointer transition-colors ${
                  activePedidoId === pedido.id ? 'bg-sky-100/70' : ''
                }`}
              >
                <td className="py-3.5 px-4 font-extrabold text-[#003377]">#{pedido.id}</td>
                <td className="py-3.5 px-4 text-slate-600 font-medium">
                  {formatTime(pedido.dataHoraCriacao)}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                  >
                    {STATUS_LABELS[pedido.status]}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-800 font-medium">
                  <div>{pedido.clienteNome}</div>
                  {pedido.comentario && (
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">
                      {pedido.comentario}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                  {formatCurrency(pedido.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#003377]">
            BALCÃO
          </h1>
          <button
            type="button"
            onClick={loadData}
            title="Atualizar pedidos"
            className="p-2.5 rounded-full border border-[#7cc0ff] bg-white text-[#0c4a96] hover:bg-sky-50 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenNewOrderPanel}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#004ca8] via-[#005ec9] to-[#0070e0] hover:from-[#003d8a] hover:to-[#005ec9] text-white font-extrabold text-sm tracking-wide shadow-lg shadow-blue-800/25 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          NOVO PEDIDO
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Tabelas PENDENTE e EM ANDAMENTO */}
        <div
          className={`${
            activePedidoId !== null
              ? 'lg:col-span-6 xl:col-span-6'
              : showNovoPedido
              ? 'lg:col-span-7 xl:col-span-8'
              : 'lg:col-span-12'
          } space-y-6`}
        >
          {/* Seção PENDENTE */}
          <section className="bg-white/95 rounded-3xl border-2 border-[#8ec8ff] shadow-[0_12px_32px_-12px_rgba(0,82,180,0.18)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-sky-100 bg-amber-50/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
                  PENDENTE
                </h2>
              </div>
              <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {pendentes.length}
              </span>
            </div>
            {renderOrderTable(pendentes, 'bg-amber-100 text-amber-800')}
          </section>

          {/* Seção EM ANDAMENTO */}
          <section className="bg-white/95 rounded-3xl border-2 border-[#8ec8ff] shadow-[0_12px_32px_-12px_rgba(0,82,180,0.18)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-sky-100 bg-gradient-to-r from-[#004ca8] to-[#0066cc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-sky-100" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  EM ANDAMENTO
                </h2>
              </div>
              <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-white/20 text-white">
                {emAndamento.length}
              </span>
            </div>
            {renderOrderTable(emAndamento, 'bg-sky-100 text-[#00449e]')}
          </section>
        </div>

        {/* Coluna Direita: Pedido aberto OU Formulário NOVO PEDIDO no mesmo lugar */}
        {activePedidoId !== null ? (
          <div className="lg:col-span-6 xl:col-span-6">
            <PedidoScreen
              key={activePedidoId}
              pedidoId={activePedidoId}
              embedded
              onOrderChanged={loadData}
              onBackToBalcao={() => {
                setActivePedidoId(null);
                loadData();
              }}
            />
          </div>
        ) : showNovoPedido && (
          <aside className="lg:col-span-5 xl:col-span-4 bg-white/95 rounded-3xl border-2 border-[#7cc0ff] shadow-[0_16px_40px_-12px_rgba(0,82,180,0.24)] p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-sky-100">
              <h2 className="text-lg font-black tracking-tight text-[#003377]">
                NOVO PEDIDO
              </h2>
              <button
                type="button"
                onClick={() => setShowNovoPedido(false)}
                className="p-1.5 rounded-full text-[#0c4a96] hover:bg-sky-50 transition cursor-pointer"
                title="Fechar painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAbrirPedido} className="space-y-4">
              {/* CLIENTE */}
              <div className="relative">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#003377] mb-1.5 ml-1">
                  CLIENTE
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#0c4a96] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    ref={clienteInputRef}
                    type="text"
                    value={clienteSearch}
                    onFocus={() => setShowClienteDropdown(true)}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setSelectedClienteId('');
                      setShowClienteDropdown(true);
                    }}
                    placeholder="Selecionar ou pesquisar cliente..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#5aa3ec] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0059c9]/30 focus:border-[#0059c9]"
                  />
                </div>

                {showClienteDropdown && (
                  <div className="absolute z-20 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-52 overflow-y-auto">
                    {filteredClientes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClienteId(c.id);
                          setClienteSearch(c.nome);
                          setShowClienteDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-sky-50 flex items-center justify-between cursor-pointer ${
                          selectedClienteId === c.id ? 'bg-sky-50 font-semibold text-sky-800' : 'text-slate-700'
                        }`}
                      >
                        <span>{c.nome}</span>
                        {c.telefone && <span className="text-xs text-slate-400">{c.telefone}</span>}
                      </button>
                    ))}
                    {clienteSearch.trim() &&
                      !clientes.some((c) => c.nome.toLowerCase() === clienteSearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={handleQuickAddCliente}
                          className="w-full text-left px-3.5 py-2.5 text-sm text-sky-700 font-semibold bg-sky-50/60 hover:bg-sky-100 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          Cadastrar &ldquo;{clienteSearch.trim()}&rdquo;
                        </button>
                      )}
                    {filteredClientes.length === 0 && !clienteSearch.trim() && (
                      <div className="px-3.5 py-3 text-xs text-slate-400">Nenhum cliente encontrado.</div>
                    )}
                  </div>
                )}
              </div>

              {/* ATENDENTE */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#003377] mb-1.5 ml-1">
                  ATENDENTE
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-[#0c4a96] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={atendenteId}
                    onChange={(e) => setAtendenteId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#5aa3ec] text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0059c9]/30 focus:border-[#0059c9]"
                  >
                    <option value="">Selecione o atendente...</option>
                    {atendentes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* COMENTÁRIO */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#003377] mb-1.5 ml-1">
                  COMENTÁRIO
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-[#0c4a96] absolute left-4 top-3" />
                  <textarea
                    rows={3}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Observações do pedido (opcional)..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-[#5aa3ec] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0059c9]/30 focus:border-[#0059c9] resize-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-3.5 py-2.5">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#004ca8] via-[#005ec9] to-[#0070e0] hover:from-[#003d8a] hover:to-[#005ec9] text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-800/25 transition disabled:opacity-60 cursor-pointer"
              >
                {creating ? 'ABRINDO...' : 'ABRIR PEDIDO'}
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
};

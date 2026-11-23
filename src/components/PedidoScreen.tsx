import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Minus,
  Trash2,
  Ban,
  CheckCircle,
  AlertCircle,
  X,
  Settings,
} from 'lucide-react';
import { api, formatCurrency, formatDateTime, STATUS_LABELS } from '../api';
import type { Atendente, Cliente, ItemPedido, Pedido, Produto } from '../types';
import { FecharPedidoModal } from './FecharPedidoModal';

interface PedidoScreenProps {
  pedidoId: number;
  onBackToBalcao: () => void;
  embedded?: boolean;
  onOrderChanged?: () => void;
}

export const PedidoScreen: React.FC<PedidoScreenProps> = ({
  pedidoId,
  onBackToBalcao,
  embedded = false,
  onOrderChanged,
}) => {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca rápida de produto e grade
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [quantidadeAdd, setQuantidadeAdd] = useState(1);
  const [showQtdConfig, setShowQtdConfig] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const buscaInputRef = useRef<HTMLInputElement>(null);

  // Modal de preço customizado (Self service código 01)
  const [selfServiceTarget, setSelfServiceTarget] = useState<
    | { mode: 'add'; produto: Produto }
    | { mode: 'edit'; item: ItemPedido }
    | null
  >(null);
  const [selfServicePrecoStr, setSelfServicePrecoStr] = useState('');
  const [selfServiceQtd, setSelfServiceQtd] = useState(1);

  // Modais
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Edição do pedido
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [editClienteId, setEditClienteId] = useState<number>(0);
  const [editAtendenteId, setEditAtendenteId] = useState<number>(0);
  const [editComentario, setEditComentario] = useState('');
  const [editStatus, setEditStatus] = useState<'PENDENTE' | 'EM_ANDAMENTO'>('EM_ANDAMENTO');
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadPedido() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPedido(pedidoId);
      setPedido(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedido.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPedido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const list = await api.getProdutos(busca.trim());
        if (active) setResultados(list);
      } catch {
        // ignore search error
      }
    }, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [busca]);

  const isEditable = pedido?.status === 'PENDENTE' || pedido?.status === 'EM_ANDAMENTO';

  async function handleAddProduto(produto: Produto, customPreco?: number, customQtd?: number) {
    if (!pedido || !isEditable) return;

    if (produto.codigo === '01' && customPreco === undefined) {
      setSelfServiceTarget({ mode: 'add', produto });
      setSelfServicePrecoStr('');
      setSelfServiceQtd(1);
      return;
    }

    const qtd = Math.max(1, Math.floor(customQtd ?? quantidadeAdd ?? 1));
    setAddingItem(true);
    setError('');
    try {
      const updated = await api.addItem(pedido.id, produto.id, qtd, customPreco);
      setPedido(updated);
      setBusca('');
      setQuantidadeAdd(1);
      buscaInputRef.current?.focus();
      onOrderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar produto.');
    } finally {
      setAddingItem(false);
    }
  }

  async function handleSubmitSelfService(e: React.FormEvent) {
    e.preventDefault();
    if (!pedido || !selfServiceTarget) return;
    const preco = Number(selfServicePrecoStr.replace(/\./g, '').replace(',', '.').trim());
    if (!Number.isFinite(preco) || preco <= 0) {
      setError('Informe um preço válido maior que zero para o Self service.');
      return;
    }

    const target = selfServiceTarget;
    setSelfServiceTarget(null);

    if (target.mode === 'add') {
      await handleAddProduto(target.produto, preco, selfServiceQtd);
    } else {
      setError('');
      try {
        const updated = await api.updateItem(pedido.id, target.item.id, selfServiceQtd, preco);
        setPedido(updated);
        onOrderChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar preço do Self service.');
      }
    }
  }

  function handleBuscaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (resultados.length === 0) return;
      const exactCode = resultados.find(
        (p) => p.codigo.toLowerCase() === busca.trim().toLowerCase()
      );
      if (exactCode) {
        handleAddProduto(exactCode);
      } else if (resultados.length === 1) {
        handleAddProduto(resultados[0]);
      }
    }
  }

  async function handleChangeQty(itemId: number, newQty: number) {
    if (!pedido || !isEditable) return;
    if (newQty <= 0) {
      return handleRemoveItem(itemId);
    }
    try {
      const updated = await api.updateItem(pedido.id, itemId, newQty);
      setPedido(updated);
      onOrderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar quantidade.');
    }
  }

  async function handleRemoveItem(itemId: number) {
    if (!pedido || !isEditable) return;
    try {
      const updated = await api.removeItem(pedido.id, itemId);
      setPedido(updated);
      onOrderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover produto.');
    }
  }

  async function openEditModal() {
    if (!pedido || !isEditable) return;
    setEditClienteId(pedido.clienteId);
    setEditAtendenteId(pedido.atendenteId);
    setEditComentario(pedido.comentario || '');
    setEditStatus(pedido.status === 'PENDENTE' ? 'PENDENTE' : 'EM_ANDAMENTO');
    setShowEditModal(true);

    try {
      const [c, a] = await Promise.all([api.getClientes(), api.getAtendentes()]);
      setClientes(c);
      setAtendentes(a);
    } catch {
      // ignore
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    setSavingEdit(true);
    try {
      const updated = await api.updatePedido(pedido.id, {
        clienteId: editClienteId,
        atendenteId: editAtendenteId,
        comentario: editComentario,
        status: editStatus,
      });
      setPedido(updated);
      setShowEditModal(false);
      onOrderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar pedido.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmCancel() {
    if (!pedido) return;
    setCanceling(true);
    try {
      await api.cancelarPedido(pedido.id);
      setShowCancelarModal(false);
      onBackToBalcao();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar pedido.');
      setShowCancelarModal(false);
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-500">
        Carregando pedido...
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-rose-600 font-semibold">{error || 'Pedido não encontrado.'}</p>
        <button
          type="button"
          onClick={onBackToBalcao}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold cursor-pointer"
        >
          Voltar ao Balcão
        </button>
      </div>
    );
  }

  const itens = pedido.itens || [];
  const statusBadge =
    pedido.status === 'FINALIZADO'
      ? 'bg-emerald-100 text-emerald-800'
      : pedido.status === 'CANCELADO'
      ? 'bg-rose-100 text-rose-800'
      : pedido.status === 'PENDENTE'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-sky-100 text-sky-800';

  return (
    <div className={embedded ? 'space-y-4' : 'max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6'}>
      {/* Barra Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToBalcao}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#7cc0ff] bg-white hover:bg-sky-50 text-[#0c4a96] text-sm font-bold shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {embedded ? 'Fechar painel' : 'Voltar ao Balcão'}
        </button>

        {isEditable && (
          <button
            type="button"
            onClick={() => setShowCancelarModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold transition cursor-pointer"
          >
            <Ban className="w-4 h-4" />
            Cancelar Pedido
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cabeçalho do Pedido */}
      <section className="bg-white/95 rounded-3xl border-2 border-[#8ec8ff] shadow-[0_12px_32px_-12px_rgba(0,82,180,0.18)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-[#003377]">
                ID #{pedido.id}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge}`}>
                {STATUS_LABELS[pedido.status]}
              </span>
              {isEditable && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 text-[#0c4a96] text-xs font-bold transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#0c4a96]/80 mt-1.5">
              Hora: <span className="font-bold text-[#003377]">{formatDateTime(pedido.dataHoraCriacao)}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="text-[#0c4a96]/70 text-xs font-extrabold uppercase">Cliente: </span>
              <span className="font-bold text-[#003377]">{pedido.clienteNome}</span>
            </div>
            <div>
              <span className="text-[#0c4a96]/70 text-xs font-extrabold uppercase">Atendente: </span>
              <span className="font-bold text-[#003377]">{pedido.atendenteNome}</span>
            </div>
            {pedido.comentario && (
              <div className="sm:col-span-2 mt-1 text-xs text-[#003377] bg-sky-50 rounded-xl px-3 py-1.5 border border-sky-200">
                <span className="font-extrabold text-[#0c4a96]">Obs: </span>
                {pedido.comentario}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Área ADICIONAR */}
      {isEditable && (
        <section className="bg-white/95 rounded-3xl border-2 border-[#7cc0ff] shadow-[0_14px_38px_-12px_rgba(0,82,180,0.22)] overflow-hidden">
          {/* Cabeçalho azul royal: ADICIONAR + botão engrenagem */}
          <div className="bg-gradient-to-r from-[#00449e] to-[#0066cc] px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              ADICIONAR
            </h2>
            <button
              type="button"
              onClick={() => setShowQtdConfig((v) => !v)}
              title="Definir quantidade padrão"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Barra de busca azul suave com botão + azul royal */}
            <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-2.5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const exact = resultados.find(
                    (p) => p.codigo.toLowerCase() === busca.trim().toLowerCase()
                  );
                  if (exact) {
                    handleAddProduto(exact);
                  } else if (resultados.length === 1) {
                    handleAddProduto(resultados[0]);
                  } else {
                    buscaInputRef.current?.focus();
                  }
                }}
                disabled={addingItem}
                title="Adicionar produto"
                className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-r from-[#004ca8] to-[#0066cc] hover:from-[#003d8a] hover:to-[#005ec9] text-white flex items-center justify-center shadow-sm transition cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="relative flex-1">
                <input
                  ref={buscaInputRef}
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={handleBuscaKeyDown}
                  placeholder="Buscar produto..."
                  className="w-full h-10 px-4 pr-9 rounded-full border border-[#5aa3ec] bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0059c9]/30 focus:border-[#0059c9]"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusca('');
                      buscaInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003377] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showQtdConfig && (
                <div className="flex items-center gap-1.5 bg-white border border-[#5aa3ec] rounded-full px-3 h-10 shrink-0">
                  <span className="text-xs font-bold text-[#0c4a96]">Qtd:</span>
                  <input
                    type="number"
                    min={1}
                    value={quantidadeAdd}
                    onChange={(e) => setQuantidadeAdd(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 text-center font-bold text-sm text-[#003377] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Grade 3 colunas de produtos */}
            {resultados.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Nenhum produto encontrado para &ldquo;{busca}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                {resultados.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={addingItem}
                    onClick={() => handleAddProduto(prod)}
                    title={`${prod.codigo} - ${prod.nome} (${formatCurrency(prod.preco)})`}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 hover:border-[#5aa3ec] active:bg-sky-200 text-left transition cursor-pointer disabled:opacity-60"
                  >
                    <span className="font-extrabold text-[#00449e] text-xs sm:text-sm shrink-0">
                      {prod.codigo}
                    </span>
                    <span className="text-[#003377] font-medium text-xs sm:text-sm truncate">
                      {prod.nome}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Barra azul Total: R$0,00 */}
            <div className="bg-gradient-to-r from-[#003a82] to-[#0055b8] text-white px-5 py-3 flex items-center justify-between rounded-2xl">
              <span className="text-sm font-bold">Total:</span>
              <span className="text-base sm:text-lg font-black">
                {formatCurrency(pedido.total)}
              </span>
            </div>

            {/* Botão Fechar pedido alinhado à direita */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={itens.length === 0}
                onClick={() => setShowFecharModal(true)}
                className="px-7 py-2.5 rounded-full bg-gradient-to-r from-[#004ca8] via-[#005ec9] to-[#0070e0] hover:from-[#003d8a] hover:to-[#005ec9] text-white text-sm font-extrabold shadow-md shadow-blue-800/20 transition disabled:opacity-50 cursor-pointer"
              >
                Fechar pedido
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Lista de Produtos do Pedido */}
      <section className="bg-white/95 rounded-3xl border-2 border-[#8ec8ff] shadow-[0_12px_32px_-12px_rgba(0,82,180,0.18)] overflow-hidden">
        <div className="px-6 py-4 border-b border-sky-100 bg-sky-50/70 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#003377]">
            PRODUTOS DO PEDIDO
          </h2>
          <span className="text-xs font-extrabold text-[#0c4a96]">
            {itens.reduce((acc, i) => acc + i.quantidade, 0)} item(ns)
          </span>
        </div>

        {itens.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Nenhum produto adicionado ainda. Use a busca acima para adicionar por código ou nome.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {itens.map((item) => (
              <div
                key={item.id}
                className="px-6 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 hover:bg-slate-50/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-extrabold text-sky-700 text-base">
                      {item.quantidade}x
                    </span>
                    <span className="font-bold text-slate-900 text-base">
                      {item.nomeProduto}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
                      Cód: {item.codigoProduto}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Preço unitário: {formatCurrency(item.precoUnitario)}</span>
                    {isEditable && item.codigoProduto === '01' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelfServiceTarget({ mode: 'edit', item });
                          setSelfServicePrecoStr(item.precoUnitario.toFixed(2).replace('.', ','));
                          setSelfServiceQtd(item.quantidade);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold transition cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        Alterar preço
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {isEditable && item.codigoProduto !== '01' && (
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleChangeQty(item.id, item.quantidade - 1)}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs cursor-pointer"
                        title="Diminuir quantidade"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-slate-900">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChangeQty(item.id, item.quantidade + 1)}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs cursor-pointer"
                        title="Aumentar quantidade"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="text-right min-w-[90px]">
                    <div className="text-xs text-slate-400">Subtotal</div>
                    <div className="font-extrabold text-slate-900 text-base">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remover produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé Total + Fechar */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              VALOR TOTAL
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {formatCurrency(pedido.total)}
            </div>
          </div>

          {isEditable ? (
            <button
              type="button"
              disabled={itens.length === 0}
              onClick={() => setShowFecharModal(true)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-base tracking-wide shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5" />
              FECHAR
            </button>
          ) : (
            pedido.pagamento && (
              <div className="text-right text-sm text-slate-600">
                <div>
                  Pagamento: <strong className="text-slate-900">{pedido.pagamento.formaPagamento}</strong>
                </div>
                {pedido.pagamento.formaPagamento === 'Dinheiro' && (
                  <div className="text-xs text-slate-500">
                    Recebido: {formatCurrency(pedido.pagamento.valorRecebido)} • Troco:{' '}
                    {formatCurrency(pedido.pagamento.troco)}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* Modal Fechar Pedido */}
      {showFecharModal && (
        <FecharPedidoModal
          pedido={pedido}
          onClose={() => setShowFecharModal(false)}
          onFinalized={() => {
            setShowFecharModal(false);
            onBackToBalcao();
          }}
        />
      )}

      {/* Modal Editar Pedido */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Editar Pedido #{pedido.id}</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Cliente
                </label>
                <select
                  value={editClienteId}
                  onChange={(e) => setEditClienteId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Atendente
                </label>
                <select
                  value={editAtendenteId}
                  onChange={(e) => setEditAtendenteId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                >
                  {atendentes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'PENDENTE' | 'EM_ANDAMENTO')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                >
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Comentário
                </label>
                <textarea
                  rows={3}
                  value={editComentario}
                  onChange={(e) => setEditComentario(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold cursor-pointer"
                >
                  {savingEdit ? 'SALVANDO...' : 'SALVAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Cancelamento */}
      {showCancelarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Cancelar Pedido #{pedido.id}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Tem certeza que deseja cancelar este pedido?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCancelarModal(false)}
                disabled={canceling}
                className="py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={canceling}
                className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer"
              >
                {canceling ? 'CANCELANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Preço Self Service (Código 01) */}
      {selfServiceTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                01 - Self service
              </h3>
              <button
                type="button"
                onClick={() => setSelfServiceTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitSelfService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Preço (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={selfServicePrecoStr}
                  onChange={(e) => setSelfServicePrecoStr(e.target.value)}
                  placeholder="Ex: 18,50"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelfServiceTarget(null)}
                  className="py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer"
                >
                  CONFIRMAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

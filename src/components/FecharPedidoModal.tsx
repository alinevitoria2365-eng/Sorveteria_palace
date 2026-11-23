import React, { useMemo, useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { api, formatCurrency } from '../api';
import type { FormaPagamento, Pedido } from '../types';

interface FecharPedidoModalProps {
  pedido: Pedido;
  onClose: () => void;
  onFinalized: (pedidoFinalizado: Pedido) => void;
}

interface PaymentLine {
  id: number;
  formaPagamento: FormaPagamento;
  valorStr: string;
}

const METODOS: FormaPagamento[] = [
  'Dinheiro',
  'Pix',
  'Cartão de débito',
  'Cartão de crédito',
];

function parseBRL(str: string): number {
  const normalized = str.replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export const FecharPedidoModal: React.FC<FecharPedidoModalProps> = ({
  pedido,
  onClose,
  onFinalized,
}) => {
  const [lines, setLines] = useState<PaymentLine[]>([
    {
      id: 1,
      formaPagamento: 'Dinheiro',
      valorStr: pedido.total.toFixed(2).replace('.', ','),
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const itens = pedido.itens || [];

  const totalPago = useMemo(() => {
    return lines.reduce((acc, line) => {
      const val = parseBRL(line.valorStr);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [lines]);

  const valorInsuficiente = useMemo(() => {
    const anyInvalid = lines.some((l) => {
      const v = parseBRL(l.valorStr);
      return !Number.isFinite(v) || v < 0;
    });
    return anyInvalid || Number(totalPago.toFixed(2)) < Number(pedido.total.toFixed(2));
  }, [lines, totalPago, pedido.total]);

  const hasDinheiro = lines.some((l) => l.formaPagamento === 'Dinheiro');

  const troco = useMemo(() => {
    if (!hasDinheiro) return 0;
    const diff = totalPago - pedido.total;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }, [hasDinheiro, totalPago, pedido.total]);

  function handleAddLine() {
    const restante = Math.max(0, Number((pedido.total - totalPago).toFixed(2)));
    setLines((prev) => [
      ...prev,
      {
        id: Date.now(),
        formaPagamento: 'Pix',
        valorStr: restante.toFixed(2).replace('.', ','),
      },
    ]);
  }

  function handleRemoveLine(id: number) {
    if (lines.length <= 1) {
      setLines([
        {
          id: Date.now(),
          formaPagamento: 'Dinheiro',
          valorStr: pedido.total.toFixed(2).replace('.', ','),
        },
      ]);
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleUpdateLine(id: number, patch: Partial<PaymentLine>) {
    setError('');
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleFinalizar() {
    setError('');
    if (valorInsuficiente) {
      setError('Valor informado é insuficiente para cobrir o total do pedido.');
      return;
    }

    const primaryLine = lines[0];
    const formaResumo: FormaPagamento = primaryLine.formaPagamento;
    const valorRecebido = hasDinheiro ? Number(totalPago.toFixed(2)) : undefined;

    setSubmitting(true);
    try {
      const updated = await api.fecharPedido(pedido.id, formaResumo, valorRecebido);
      onFinalized(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#00285c]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-[0_24px_60px_-15px_rgba(0,64,145,0.4)] border-2 border-[#7cc0ff] w-full max-w-4xl overflow-hidden my-auto">
        {/* Corpo em 2 colunas lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-sky-200">
          {/* ESQUERDA: PRODUTO ADICIONADO */}
          <div className="flex flex-col justify-between bg-white">
            <div>
              <div className="bg-gradient-to-r from-[#00449e] to-[#0066cc] px-5 py-3 flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  PRODUTO ADICIONADO (#{pedido.id})
                </h2>
              </div>

              <div className="divide-y divide-sky-100 max-h-72 overflow-y-auto">
                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#003377] truncate">
                        {item.quantidade}x {item.nomeProduto}
                      </div>
                      <div className="text-xs text-[#0c4a96]/70">
                        Cód: {item.codigoProduto} • Unit: {formatCurrency(item.precoUnitario)}
                      </div>
                    </div>
                    <div className="font-extrabold text-[#003377] shrink-0">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="px-5 py-2.5 bg-sky-50 border-t border-sky-100 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#0c4a96]">Subtotal:</span>
                <span className="font-bold text-[#003377]">{formatCurrency(pedido.subtotal)}</span>
              </div>
              <div className="px-5 py-3.5 bg-gradient-to-r from-[#003a82] to-[#0055b8] text-white flex items-center justify-between">
                <span className="text-sm font-bold">Total:</span>
                <span className="text-lg font-black">{formatCurrency(pedido.total)}</span>
              </div>
            </div>
          </div>

          {/* DIREITA: PAGAR */}
          <div className="flex flex-col justify-between bg-sky-50/40">
            <div>
              {/* Cabeçalho azul PAGAR + botão + */}
              <div className="bg-gradient-to-r from-[#00449e] to-[#0066cc] px-5 py-2.5 flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  PAGAR
                </h2>
                <button
                  type="button"
                  onClick={handleAddLine}
                  title="Adicionar forma de pagamento"
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Linhas de pagamento */}
              <div className="p-4 space-y-3">
                {lines.map((line) => (
                  <div key={line.id} className="flex items-center gap-2.5">
                    <select
                      value={line.formaPagamento}
                      onChange={(e) =>
                        handleUpdateLine(line.id, {
                          formaPagamento: e.target.value as FormaPagamento,
                        })
                      }
                      className="flex-1 min-w-[130px] h-10 px-3.5 rounded-full border border-[#5aa3ec] bg-white text-sm font-bold text-[#003377] focus:outline-none focus:border-[#0059c9]"
                    >
                      {METODOS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <span className="text-sm font-extrabold text-[#003377]">R$</span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.valorStr}
                      onChange={(e) => handleUpdateLine(line.id, { valorStr: e.target.value })}
                      className="w-28 h-10 px-3.5 rounded-full border border-[#5aa3ec] bg-white text-sm font-extrabold text-[#003377] focus:outline-none focus:border-[#0059c9]"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.id)}
                      title="Remover linha"
                      className="p-1.5 text-[#0c4a96] hover:text-rose-600 transition cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                ))}

                {error && (
                  <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-3.5 py-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé Troco + Botões Cancelar / Fechar pedido */}
            <div>
              <div className="px-5 py-3 bg-sky-100/80 border-t border-sky-200 flex items-center justify-between">
                <span className="text-sm font-bold text-[#0c4a96]">Troco:</span>
                <span
                  className={`text-lg font-black ${
                    valorInsuficiente ? 'text-rose-600' : 'text-[#003377]'
                  }`}
                >
                  {valorInsuficiente ? 'Insuficiente' : formatCurrency(troco)}
                </span>
              </div>

              <div className="px-5 py-3.5 bg-white border-t border-sky-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-full border border-[#7cc0ff] bg-white hover:bg-sky-50 text-[#0c4a96] text-sm font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={submitting || valorInsuficiente}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#004ca8] via-[#005ec9] to-[#0070e0] hover:from-[#003d8a] hover:to-[#005ec9] text-white text-sm font-extrabold shadow-md shadow-blue-800/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Fechando...' : 'Fechar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

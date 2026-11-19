import React, { useEffect, useState } from 'react';
import { Receipt, TrendingUp } from 'lucide-react';
import { api, formatCurrency, formatDateTime, STATUS_LABELS } from '../api';
import type { HistoricoResumo, Pedido } from '../types';

interface HistoricoScreenProps {
  onOpenPedido: (id: number) => void;
}

export const HistoricoScreen: React.FC<HistoricoScreenProps> = ({ onOpenPedido }) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [resumo, setResumo] = useState<HistoricoResumo | null>(null);
  const [filter, setFilter] = useState<'FINALIZADO' | 'CANCELADO' | 'ALL'>('FINALIZADO');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const statusParam = filter === 'ALL' ? 'FINALIZADO,CANCELADO' : filter;
        const [p, r] = await Promise.all([api.getPedidos(statusParam), api.getHistoricoResumo()]);
        setPedidos(p);
        setResumo(r);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">HISTÓRICO DE VENDAS</h1>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
          {(
            [
              ['FINALIZADO', 'Finalizados'],
              ['CANCELADO', 'Cancelados'],
              ['ALL', 'Todos'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === key ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Receipt className="w-4 h-4 text-sky-600" />
              Vendas Finalizadas
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {resumo.quantidadeFinalizados}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Total Vendido
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2">
              {formatCurrency(resumo.totalVendido)}
            </div>
          </div>

          {resumo.porFormaPagamento.map((pg) => (
            <div key={pg.formaPagamento} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="text-xs font-bold uppercase text-slate-500">{pg.formaPagamento}</div>
              <div className="text-xl font-extrabold text-slate-900 mt-2">
                {formatCurrency(pg.total)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{pg.quantidade} venda(s)</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Carregando histórico...</div>
        ) : pedidos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Nenhum pedido encontrado neste filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">DATA / HORA</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">CLIENTE</th>
                  <th className="py-3 px-4">ATENDENTE</th>
                  <th className="py-3 px-4">PAGAMENTO</th>
                  <th className="py-3 px-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pedidos.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onOpenPedido(p.id)}
                    className="hover:bg-sky-50/70 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">#{p.id}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDateTime(p.dataHoraFinalizacao || p.dataHoraCancelamento || p.dataHoraCriacao)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.status === 'FINALIZADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{p.clienteNome}</td>
                    <td className="py-3.5 px-4 text-slate-600">{p.atendenteNome}</td>
                    <td className="py-3.5 px-4 text-slate-600">{p.formaPagamento || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

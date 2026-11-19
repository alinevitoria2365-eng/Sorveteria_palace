import React, { useEffect, useState } from 'react';
import { Package, Users, UserCheck, Plus, AlertCircle, Check } from 'lucide-react';
import { api, formatCurrency } from '../api';
import type { Atendente, Cliente, Produto } from '../types';

export const CadastrosScreen: React.FC = () => {
  const [tab, setTab] = useState<'produtos' | 'clientes' | 'atendentes'>('produtos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Produto
  const [codigo, setCodigo] = useState('');
  const [nomeProd, setNomeProd] = useState('');
  const [precoStr, setPrecoStr] = useState('');

  // Form Cliente
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');

  // Form Atendente
  const [nomeAtendente, setNomeAtendente] = useState('');

  async function loadAll() {
    try {
      const [p, c, a] = await Promise.all([
        api.getProdutos('', true),
        api.getClientes(),
        api.getAtendentes(),
      ]);
      setProdutos(p);
      setClientes(c);
      setAtendentes(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cadastros.');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handleCreateProduto(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const preco = Number(precoStr.replace(',', '.'));
    if (!codigo.trim() || !nomeProd.trim() || !Number.isFinite(preco) || preco < 0) {
      setError('Preencha código, nome e preço válido.');
      return;
    }
    try {
      const created = await api.createProduto({
        codigo: codigo.trim(),
        nome: nomeProd.trim(),
        preco,
      });
      setProdutos((prev) => [...prev, created]);
      setCodigo('');
      setNomeProd('');
      setPrecoStr('');
      flashSuccess('Produto cadastrado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    }
  }

  async function handleToggleProdutoAtivo(prod: Produto) {
    setError('');
    try {
      const updated = await api.updateProduto(prod.id, { ativo: prod.ativo === 1 ? false : true });
      setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto.');
    }
  }

  async function handleCreateCliente(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nomeCliente.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    try {
      const created = await api.createCliente(nomeCliente.trim(), telefoneCliente.trim());
      setClientes((prev) => [...prev, created]);
      setNomeCliente('');
      setTelefoneCliente('');
      flashSuccess('Cliente cadastrado!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar cliente.');
    }
  }

  async function handleCreateAtendente(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nomeAtendente.trim()) {
      setError('Informe o nome do atendente.');
      return;
    }
    try {
      const created = await api.createAtendente(nomeAtendente.trim());
      setAtendentes((prev) => [...prev, created]);
      setNomeAtendente('');
      flashSuccess('Atendente cadastrado!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar atendente.');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">CADASTROS</h1>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTab('produtos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              tab === 'produtos' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            Produtos
          </button>
          <button
            type="button"
            onClick={() => setTab('clientes')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              tab === 'clientes' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>
          <button
            type="button"
            onClick={() => setTab('atendentes')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              tab === 'atendentes' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Atendentes
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {tab === 'produtos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateProduto}
            className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-extrabold uppercase text-slate-700">Novo Produto</h2>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Código (atalho rápido)
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: 300"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Nome do Produto
              </label>
              <input
                type="text"
                value={nomeProd}
                onChange={(e) => setNomeProd(e.target.value)}
                placeholder="Ex: Caldo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Preço (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={precoStr}
                onChange={(e) => setPrecoStr(e.target.value)}
                placeholder="Ex: 14,00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto
            </button>
          </form>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">CÓDIGO</th>
                  <th className="py-3 px-4">PRODUTO</th>
                  <th className="py-3 px-4 text-right">PREÇO</th>
                  <th className="py-3 px-4 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {produtos.map((p) => (
                  <tr key={p.id} className={p.ativo ? '' : 'opacity-50 bg-slate-50'}>
                    <td className="py-3 px-4 font-extrabold text-slate-800">{p.codigo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.nome}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatCurrency(p.preco)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleProdutoAtivo(p)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                          p.ativo
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCliente}
            className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-extrabold uppercase text-slate-700">Novo Cliente</h2>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Cliente
            </button>
          </form>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">NOME</th>
                  <th className="py-3 px-4">TELEFONE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-bold text-slate-500">#{c.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.nome}</td>
                    <td className="py-3 px-4 text-slate-600">{c.telefone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'atendentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateAtendente}
            className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-extrabold uppercase text-slate-700">Novo Atendente</h2>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label>
              <input
                type="text"
                value={nomeAtendente}
                onChange={(e) => setNomeAtendente(e.target.value)}
                placeholder="Nome do atendente"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Atendente
            </button>
          </form>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">NOME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {atendentes.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-bold text-slate-500">#{a.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

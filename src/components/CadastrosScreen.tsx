import React, { useEffect, useState } from 'react';
import { Package, UserCheck, Users, Plus, AlertCircle, Check } from 'lucide-react';
import { api, formatCurrency } from '../api';
import type { Atendente, Produto, UsuarioItem } from '../types';

export const CadastrosScreen: React.FC = () => {
  const [tab, setTab] = useState<'produtos' | 'atendentes' | 'usuarios'>('produtos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Produto
  const [codigo, setCodigo] = useState('');
  const [nomeProd, setNomeProd] = useState('');
  const [precoStr, setPrecoStr] = useState('');

  // Form Atendente
  const [nomeAtendente, setNomeAtendente] = useState('');

  // Form Usuário
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senhaUsuario, setSenhaUsuario] = useState('');

  async function loadAll() {
    try {
      const [p, a, u] = await Promise.all([
        api.getProdutos('', true),
        api.getAtendentes(),
        api.getUsuarios(),
      ]);
      setProdutos(p);
      setAtendentes(a);
      setUsuarios(u);
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

  async function handleCreateUsuario(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nomeUsuario.trim() || !loginUsuario.trim() || !senhaUsuario) {
      setError('Preencha nome, usuário e senha.');
      return;
    }
    try {
      const created = await api.createUsuario({
        nome: nomeUsuario.trim(),
        usuario: loginUsuario.trim(),
        senha: senhaUsuario,
      });
      setUsuarios((prev) => [...prev, created]);
      setNomeUsuario('');
      setLoginUsuario('');
      setSenhaUsuario('');
      flashSuccess('Usuário cadastrado no PostgreSQL!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar usuário.');
    }
  }

  async function handleToggleUsuarioAtivo(user: UsuarioItem) {
    setError('');
    try {
      const updated = await api.updateUsuario(user.id, { ativo: user.ativo !== 1 });
      setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-black text-[#123d26]">CADASTROS</h1>
        <div className="flex items-center gap-1.5 bg-white/95 p-1.5 rounded-full border-2 border-[#9dbb9f] shadow-xs">
          <button
            type="button"
            onClick={() => setTab('produtos')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              tab === 'produtos'
                ? 'bg-gradient-to-r from-[#123d26] to-[#1b5e3a] text-white shadow-xs'
                : 'text-[#1b5e3a] hover:bg-[#eef4ec]'
            }`}
          >
            <Package className="w-4 h-4" />
            Produtos
          </button>
          <button
            type="button"
            onClick={() => setTab('atendentes')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              tab === 'atendentes'
                ? 'bg-gradient-to-r from-[#123d26] to-[#1b5e3a] text-white shadow-xs'
                : 'text-[#1b5e3a] hover:bg-[#eef4ec]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Atendentes
          </button>
          <button
            type="button"
            onClick={() => setTab('usuarios')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              tab === 'usuarios'
                ? 'bg-gradient-to-r from-[#123d26] to-[#1b5e3a] text-white shadow-xs'
                : 'text-[#1b5e3a] hover:bg-[#eef4ec]'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
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
            className="lg:col-span-4 bg-white/95 rounded-3xl border-2 border-[#9dbb9f] p-6 shadow-[0_12px_32px_-12px_rgba(20,69,43,0.18)] space-y-4"
          >
            <h2 className="text-sm font-black uppercase text-[#123d26]">Novo Produto</h2>
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
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#123d26] via-[#1b5e3a] to-[#267349] hover:from-[#0d2e1c] hover:to-[#1b5e3a] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto
            </button>
          </form>

          <div className="lg:col-span-8 bg-white/95 rounded-3xl border-2 border-[#9dbb9f] shadow-[0_12px_32px_-12px_rgba(20,69,43,0.18)] overflow-hidden">
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
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#123d26] via-[#1b5e3a] to-[#267349] hover:from-[#0d2e1c] hover:to-[#1b5e3a] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Atendente
            </button>
          </form>

          <div className="lg:col-span-8 bg-white/95 rounded-3xl border-2 border-[#9dbb9f] shadow-[0_12px_32px_-12px_rgba(20,69,43,0.18)] overflow-hidden">
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

      {tab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateUsuario}
            className="lg:col-span-4 bg-white/95 rounded-3xl border-2 border-[#9dbb9f] p-6 shadow-[0_12px_32px_-12px_rgba(20,69,43,0.18)] space-y-4"
          >
            <h2 className="text-sm font-black uppercase text-[#123d26]">Novo Usuário de Login</h2>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Usuário (login)
              </label>
              <input
                type="text"
                value={loginUsuario}
                onChange={(e) => setLoginUsuario(e.target.value)}
                placeholder="Ex: maria"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={senhaUsuario}
                onChange={(e) => setSenhaUsuario(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#123d26] via-[#1b5e3a] to-[#267349] hover:from-[#0d2e1c] hover:to-[#1b5e3a] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Usuário
            </button>
          </form>

          <div className="lg:col-span-8 bg-white/95 rounded-3xl border-2 border-[#9dbb9f] shadow-[0_12px_32px_-12px_rgba(20,69,43,0.18)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">NOME</th>
                  <th className="py-3 px-4">USUÁRIO</th>
                  <th className="py-3 px-4 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.ativo ? '' : 'opacity-50 bg-slate-50'}>
                    <td className="py-3 px-4 font-bold text-slate-500">#{u.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.nome}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{u.usuario}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleUsuarioAtivo(u)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                          u.ativo
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
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

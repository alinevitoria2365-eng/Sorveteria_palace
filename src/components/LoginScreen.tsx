import React, { useState } from 'react';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { api, setStoredToken } from '../api';
import type { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

const IceCreamLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <path
      d="M20 28C20 21.3726 25.3726 16 32 16C38.6274 16 44 21.3726 44 28C45.6569 28 47 29.3431 47 31C47 32.6569 45.6569 34 44 34H20C18.3431 34 17 32.6569 17 31C17 29.3431 18.3431 28 20 28Z"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <path
      d="M21 34L32 54L43 34"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M26 43L37 35M28 47L39 40"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!usuario.trim() || !senha) {
      setError('Preencha usuário e senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(usuario.trim(), senha);
      setStoredToken(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#d8ecff] via-[#cbe6ff] to-[#b5dcff] flex items-center justify-center p-4 pt-14">
      {/* Ondas e formas suaves de fundo */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full h-44 text-[#1d6fd6]/25"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,229.3C1120,235,1280,213,1360,202.7L1440,192L1440,320L0,320Z"
        />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full h-28 text-[#0052b4]/85"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,256L120,245.3C240,235,480,213,720,224C960,235,1200,277,1320,298.7L1440,320L1440,320L0,320Z"
        />
      </svg>

      {/* Ilustração decorativa canto superior esquerdo */}
      <div className="pointer-events-none absolute -top-3 left-3 sm:left-10 text-[#1c6dd0]/60 -rotate-12">
        <IceCreamLogoSvg className="w-28 h-28 sm:w-36 sm:h-36" />
      </div>

      {/* Tracinhos decorativos canto superior direito */}
      <svg
        className="pointer-events-none absolute top-8 right-6 sm:right-14 w-16 h-16 text-[#1c6dd0]/70"
        viewBox="0 0 64 64"
        fill="none"
      >
        <path d="M16 32L24 14M32 34L44 18M40 44L56 38" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      </svg>

      {/* Ilustração decorativa canto inferior direito */}
      <div className="pointer-events-none absolute -bottom-2 right-2 sm:right-10 text-[#00449e]/50 rotate-12">
        <IceCreamLogoSvg className="w-28 h-28 sm:w-36 sm:h-36" />
      </div>

      {/* Card Central */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xs rounded-[28px] border-2 border-[#6ab0f3] shadow-[0_18px_45px_-12px_rgba(0,72,160,0.28)] px-7 sm:px-10 pt-12 pb-8">
        {/* Badge Circular Flutuante no Topo */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-b from-[#0a66cc] to-[#003f91] text-white flex items-center justify-center shadow-lg shadow-blue-900/30 ring-4 ring-white">
          <IceCreamLogoSvg className="w-11 h-11" />
        </div>

        {/* Linhas laterais do topo + Título */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent to-[#5aa3ec]" />
          <div className="w-14" />
          <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent to-[#5aa3ec]" />
        </div>

        <div className="text-center mb-7">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#003377]">
            SORVETERIA PALÁCIO
          </h1>
          <p className="text-sm italic font-medium text-[#0c4a96] mt-1">
            Acesso ao Balcão
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#003377] mb-1.5 ml-1">
              <UserIcon className="w-3.5 h-3.5 text-[#00449e]" />
              USUÁRIO
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#0c4a96] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Digite seu usuário"
                autoFocus
                className="w-full pl-11 pr-4 py-3 rounded-full border border-[#5aa3ec] bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0059c9]/30 focus:border-[#0059c9] transition"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#003377] mb-1.5 ml-1">
              <Lock className="w-3.5 h-3.5 text-[#00449e]" />
              SENHA
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#0c4a96] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full pl-11 pr-4 py-3 rounded-full border border-[#5aa3ec] bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0059c9]/30 focus:border-[#0059c9] transition"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-full bg-gradient-to-r from-[#004ca8] via-[#005ec9] to-[#0070e0] hover:from-[#003d8a] hover:to-[#005ec9] text-white font-extrabold tracking-wider shadow-lg shadow-blue-800/25 transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        {/* Rodapé com divisor e ícone */}
        <div className="mt-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#7ab8f5]" />
            <IceCreamLogoSvg className="w-5 h-5 text-[#0c4a96]" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#7ab8f5]" />
          </div>
          <p className="text-center text-xs text-[#0c4a96]">
            Acesso padrão: <span className="font-bold text-[#003377]">admin</span> ou{' '}
            <span className="font-bold text-[#003377]">balcao</span> • Senha:{' '}
            <span className="font-bold text-[#003377]">123456</span>
          </p>
        </div>
      </div>
    </div>
  );
};

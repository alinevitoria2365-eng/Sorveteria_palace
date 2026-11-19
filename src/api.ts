import { localStore } from './localStore';
import type {
  Atendente,
  Cliente,
  FormaPagamento,
  HistoricoResumo,
  Pedido,
  PedidoStatus,
  Produto,
  User,
} from './types';

function isStaticHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:')
  );
}

const TOKEN_KEY = 'sorveteria_pdv_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

let onUnauthorizedCallback: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.includes('/api/auth/login')) {
    setStoredToken(null);
    onUnauthorizedCallback?.();
    throw new Error(data.error || 'Sessão expirada.');
  }

  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }

  return data as T;
}

export const api = {
  login: async (usuario: string, senha: string) =>
    isStaticHost()
      ? localStore.login(usuario, senha)
      : request<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ usuario, senha }),
        }),
  me: async () =>
    isStaticHost() ? localStore.me(getStoredToken()) : request<{ user: User }>('/api/auth/me'),

  getClientes: async () =>
    isStaticHost() ? localStore.getClientes() : request<Cliente[]>('/api/clientes'),
  createCliente: async (nome: string, telefone = '') =>
    isStaticHost()
      ? localStore.createCliente(nome, telefone)
      : request<Cliente>('/api/clientes', {
          method: 'POST',
          body: JSON.stringify({ nome, telefone }),
        }),

  getAtendentes: async () =>
    isStaticHost() ? localStore.getAtendentes() : request<Atendente[]>('/api/atendentes'),
  createAtendente: async (nome: string) =>
    isStaticHost()
      ? localStore.createAtendente(nome)
      : request<Atendente>('/api/atendentes', {
          method: 'POST',
          body: JSON.stringify({ nome }),
        }),

  getProdutos: async (q = '', includeInactive = false) => {
    if (isStaticHost()) return localStore.getProdutos(q, includeInactive);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (includeInactive) params.set('includeInactive', '1');
    const qs = params.toString();
    return request<Produto[]>(`/api/produtos${qs ? `?${qs}` : ''}`);
  },
  createProduto: async (data: { codigo: string; nome: string; preco: number }) =>
    isStaticHost()
      ? localStore.createProduto(data)
      : request<Produto>('/api/produtos', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
  updateProduto: async (
    id: number,
    data: Partial<{ codigo: string; nome: string; preco: number; ativo: boolean }>
  ) =>
    isStaticHost()
      ? localStore.updateProduto(id, data)
      : request<Produto>(`/api/produtos/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

  getPedidos: async (status?: string) =>
    isStaticHost()
      ? localStore.getPedidos(status)
      : request<Pedido[]>(`/api/pedidos${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  getPedido: async (id: number) =>
    isStaticHost() ? localStore.getPedido(id) : request<Pedido>(`/api/pedidos/${id}`),
  createPedido: async (data: {
    clienteId: number;
    atendenteId: number;
    comentario: string;
    status?: 'PENDENTE' | 'EM_ANDAMENTO';
  }) =>
    isStaticHost()
      ? localStore.createPedido(data)
      : request<Pedido>('/api/pedidos', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
  updatePedido: async (
    id: number,
    data: Partial<{
      clienteId: number;
      atendenteId: number;
      comentario: string;
      status: 'PENDENTE' | 'EM_ANDAMENTO';
      acrescimos: number;
      descontos: number;
    }>
  ) =>
    isStaticHost()
      ? localStore.updatePedido(id, data)
      : request<Pedido>(`/api/pedidos/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

  addItem: async (pedidoId: number, produtoId: number, quantidade = 1, precoUnitario?: number) =>
    isStaticHost()
      ? localStore.addItem(pedidoId, produtoId, quantidade, precoUnitario)
      : request<Pedido>(`/api/pedidos/${pedidoId}/itens`, {
          method: 'POST',
          body: JSON.stringify({
            produtoId,
            quantidade,
            ...(precoUnitario !== undefined ? { precoUnitario } : {}),
          }),
        }),
  updateItem: async (pedidoId: number, itemId: number, quantidade: number, precoUnitario?: number) =>
    isStaticHost()
      ? localStore.updateItem(pedidoId, itemId, quantidade, precoUnitario)
      : request<Pedido>(`/api/pedidos/${pedidoId}/itens/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({
            quantidade,
            ...(precoUnitario !== undefined ? { precoUnitario } : {}),
          }),
        }),
  removeItem: async (pedidoId: number, itemId: number) =>
    isStaticHost()
      ? localStore.removeItem(pedidoId, itemId)
      : request<Pedido>(`/api/pedidos/${pedidoId}/itens/${itemId}`, {
          method: 'DELETE',
        }),

  fecharPedido: async (pedidoId: number, formaPagamento: FormaPagamento, valorRecebido?: number) =>
    isStaticHost()
      ? localStore.fecharPedido(pedidoId, formaPagamento, valorRecebido)
      : request<Pedido>(`/api/pedidos/${pedidoId}/fechar`, {
          method: 'POST',
          body: JSON.stringify({ formaPagamento, valorRecebido }),
        }),
  cancelarPedido: async (pedidoId: number) =>
    isStaticHost()
      ? localStore.cancelarPedido(pedidoId)
      : request<Pedido>(`/api/pedidos/${pedidoId}/cancelar`, {
          method: 'POST',
        }),

  getHistoricoResumo: async () =>
    isStaticHost() ? localStore.getHistoricoResumo() : request<HistoricoResumo>('/api/historico/resumo'),
};

export function formatCurrency(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '--/--/-- --:--:--';
  const d = new Date(isoString);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} ${time}`;
}

export const STATUS_LABELS: Record<PedidoStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

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
  login: (usuario: string, senha: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, senha }),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),

  getClientes: () => request<Cliente[]>('/api/clientes'),
  createCliente: (nome: string, telefone = '') =>
    request<Cliente>('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome, telefone }),
    }),

  getAtendentes: () => request<Atendente[]>('/api/atendentes'),
  createAtendente: (nome: string) =>
    request<Atendente>('/api/atendentes', {
      method: 'POST',
      body: JSON.stringify({ nome }),
    }),

  getProdutos: (q = '', includeInactive = false) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (includeInactive) params.set('includeInactive', '1');
    const qs = params.toString();
    return request<Produto[]>(`/api/produtos${qs ? `?${qs}` : ''}`);
  },
  createProduto: (data: { codigo: string; nome: string; preco: number }) =>
    request<Produto>('/api/produtos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduto: (id: number, data: Partial<{ codigo: string; nome: string; preco: number; ativo: boolean }>) =>
    request<Produto>(`/api/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getPedidos: (status?: string) =>
    request<Pedido[]>(`/api/pedidos${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  getPedido: (id: number) => request<Pedido>(`/api/pedidos/${id}`),
  createPedido: (data: {
    clienteId: number;
    atendenteId: number;
    comentario: string;
    status?: 'PENDENTE' | 'EM_ANDAMENTO';
  }) =>
    request<Pedido>('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePedido: (
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
    request<Pedido>(`/api/pedidos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addItem: (pedidoId: number, produtoId: number, quantidade = 1, precoUnitario?: number) =>
    request<Pedido>(`/api/pedidos/${pedidoId}/itens`, {
      method: 'POST',
      body: JSON.stringify({
        produtoId,
        quantidade,
        ...(precoUnitario !== undefined ? { precoUnitario } : {}),
      }),
    }),
  updateItem: (pedidoId: number, itemId: number, quantidade: number, precoUnitario?: number) =>
    request<Pedido>(`/api/pedidos/${pedidoId}/itens/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        quantidade,
        ...(precoUnitario !== undefined ? { precoUnitario } : {}),
      }),
    }),
  removeItem: (pedidoId: number, itemId: number) =>
    request<Pedido>(`/api/pedidos/${pedidoId}/itens/${itemId}`, {
      method: 'DELETE',
    }),

  fecharPedido: (pedidoId: number, formaPagamento: FormaPagamento, valorRecebido?: number) =>
    request<Pedido>(`/api/pedidos/${pedidoId}/fechar`, {
      method: 'POST',
      body: JSON.stringify({ formaPagamento, valorRecebido }),
    }),
  cancelarPedido: (pedidoId: number) =>
    request<Pedido>(`/api/pedidos/${pedidoId}/cancelar`, {
      method: 'POST',
    }),

  getHistoricoResumo: () => request<HistoricoResumo>('/api/historico/resumo'),
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

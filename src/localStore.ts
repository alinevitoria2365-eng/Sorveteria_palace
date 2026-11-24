import type {
  Atendente,
  Cliente,
  FormaPagamento,
  HistoricoResumo,
  ItemPedido,
  Pagamento,
  Pedido,
  Produto,
  User,
} from './types';

const STORE_KEY = 'sorveteria_pdv_static_store_v8';

interface StoreState {
  nextIds: {
    cliente: number;
    atendente: number;
    produto: number;
    pedido: number;
    item: number;
    pagamento: number;
  };
  clientes: Cliente[];
  atendentes: Atendente[];
  produtos: Produto[];
  pedidos: Array<
    Omit<Pedido, 'clienteNome' | 'clienteTelefone' | 'atendenteNome' | 'itens' | 'pagamento'>
  >;
  itens: ItemPedido[];
  pagamentos: Pagamento[];
}

const DEFAULT_USERS: Array<User & { senha: string }> = [
  { id: 1, nome: 'Administrador', usuario: 'admin', senha: '123456' },
  { id: 2, nome: 'Operador Balcão', usuario: 'balcao', senha: '123456' },
];

function createInitialState(): StoreState {
  const produtos: Produto[] = [
    { id: 1, codigo: '01', nome: 'Self service', preco: 0, ativo: 1 },
    { id: 2, codigo: '12', nome: 'Banana split', preco: 25.0, ativo: 1 },
    { id: 3, codigo: '13', nome: 'Refrigerante Lata', preco: 6.5, ativo: 1 },
    { id: 34, codigo: '14', nome: 'Café gelado', preco: 15.0, ativo: 1 },
    { id: 4, codigo: '15', nome: 'Capuccino', preco: 18.0, ativo: 1 },
    { id: 5, codigo: '16', nome: 'Cascão 1 bola', preco: 9.0, ativo: 1 },
    { id: 6, codigo: '17', nome: 'Cascão 2 bolas', preco: 14.0, ativo: 1 },
    { id: 7, codigo: '18', nome: 'Cascão pacote', preco: 9.0, ativo: 1 },
    { id: 8, codigo: '23', nome: 'Cestinha Recheada 1 bola', preco: 9.0, ativo: 1 },
    { id: 9, codigo: '25', nome: 'Colegial', preco: 18.0, ativo: 1 },
    { id: 10, codigo: '26', nome: 'Sundae Especial', preco: 17.0, ativo: 1 },
    { id: 11, codigo: '31', nome: 'Picolé Pistache/Brigadeiro', preco: 5.0, ativo: 1 },
    { id: 12, codigo: '32', nome: 'Picolé Skimo/Tentação', preco: 4.0, ativo: 1 },
    { id: 13, codigo: '33', nome: 'Picolé', preco: 2.0, ativo: 1 },
    { id: 14, codigo: '50', nome: 'Milk Shake pequeno', preco: 13.0, ativo: 1 },
    { id: 15, codigo: '51', nome: 'Milk Shake Médio', preco: 16.0, ativo: 1 },
    { id: 16, codigo: '52', nome: 'Milk Shake Grande', preco: 22.0, ativo: 1 },
    { id: 17, codigo: '53', nome: 'Caixa 5 litros - tradicional', preco: 100.0, ativo: 1 },
    { id: 18, codigo: '54', nome: 'Mini cobertura', preco: 15.0, ativo: 1 },
    { id: 19, codigo: '60', nome: 'Casquinha 1 bola', preco: 11.5, ativo: 1 },
    { id: 20, codigo: '61', nome: 'Casquinha pacote', preco: 5.0, ativo: 1 },
    { id: 22, codigo: '62', nome: 'Cestinha gourmet', preco: 25.0, ativo: 1 },
    { id: 23, codigo: '71', nome: 'Morango split', preco: 26.0, ativo: 1 },
    { id: 24, codigo: '90', nome: 'Água c/ gás', preco: 4.0, ativo: 1 },
    { id: 23, codigo: '91', nome: 'Água Mineral 500ml', preco: 3.5, ativo: 1 },
    { id: 24, codigo: '92', nome: 'Petit Gateau com Sorvete', preco: 24.0, ativo: 1 },
    { id: 25, codigo: '300', nome: 'Caldo', preco: 14.0, ativo: 1 },
    { id: 26, codigo: '100', nome: 'Adicional cobertura 1', preco: 1.0, ativo: 1 },
    { id: 27, codigo: '200', nome: 'Adicional cobertura 2', preco: 2.0, ativo: 1 },
    { id: 35, codigo: '333', nome: 'Picolé Açaí/Ninho', preco: 2.5, ativo: 1 },
    { id: 28, codigo: '-', nome: 'Caixa 5 litros - trufado/recheado', preco: 120.0, ativo: 1 },
    { id: 29, codigo: '-', nome: 'Caixa 10 litros', preco: 140.0, ativo: 1 },
    { id: 30, codigo: '-', nome: 'Milk shake - taça', preco: 16.0, ativo: 1 },
    { id: 31, codigo: '-', nome: 'Adicional cereja / paçoca', preco: 1.0, ativo: 1 },
    { id: 32, codigo: '-', nome: 'Adicional confete', preco: 3.0, ativo: 1 },
    { id: 33, codigo: '-', nome: 'Casquinha/Cestinha/Cascão/Palito/canudo biju recheado (unidade)', preco: 1.0, ativo: 1 },
  ];

  return {
    nextIds: {
      cliente: 6,
      atendente: 4,
      produto: produtos.length + 1,
      pedido: 1,
      item: 1,
      pagamento: 1,
    },
    clientes: [
      { id: 1, nome: 'Cliente Avulso', telefone: '', ativo: 1 },
      { id: 2, nome: 'João Pedro', telefone: '(11) 99876-5432', ativo: 1 },
      { id: 3, nome: 'Maria Clara', telefone: '(11) 99123-4567', ativo: 1 },
      { id: 4, nome: 'Lucas Oliveira', telefone: '(11) 98765-4321', ativo: 1 },
      { id: 5, nome: 'Fernanda Costa', telefone: '(11) 98456-7890', ativo: 1 },
    ],
    atendentes: [
      { id: 1, nome: 'Ana Paula', ativo: 1 },
      { id: 2, nome: 'Carlos Eduardo', ativo: 1 },
      { id: 3, nome: 'Mariana Silva', ativo: 1 },
    ],
    produtos,
    pedidos: [],
    itens: [],
    pagamentos: [],
  };
}

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as StoreState;
  } catch {
    // ignore parse error
  }
  const initial = createInitialState();
  saveState(initial);
  return initial;
}

function saveState(state: StoreState) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function hydratePedido(state: StoreState, id: number): Pedido {
  const p = state.pedidos.find((row) => row.id === id);
  if (!p) throw new Error('Pedido não encontrado.');
  const cliente = state.clientes.find((c) => c.id === p.clienteId);
  const atendente = state.atendentes.find((a) => a.id === p.atendenteId);
  const itens = state.itens.filter((i) => i.pedidoId === p.id);
  const pagamento = state.pagamentos.find((pg) => pg.pedidoId === p.id) || null;
  return {
    ...p,
    clienteNome: cliente?.nome || 'Cliente',
    clienteTelefone: cliente?.telefone || '',
    atendenteNome: atendente?.nome || 'Atendente',
    itens,
    pagamento,
  };
}

function recalc(state: StoreState, pedidoId: number) {
  const p = state.pedidos.find((row) => row.id === pedidoId);
  if (!p) return;
  const soma = state.itens
    .filter((i) => i.pedidoId === pedidoId)
    .reduce((acc, i) => acc + i.subtotal, 0);
  p.subtotal = Number(soma.toFixed(2));
  p.total = Number(Math.max(0, p.subtotal + p.acrescimos - p.descontos).toFixed(2));
}

export const localStore = {
  login(usuario: string, senha: string): { token: string; user: User } {
    const found = DEFAULT_USERS.find((u) => u.usuario === usuario.trim() && u.senha === senha);
    if (!found) throw new Error('Usuário ou senha inválidos.');
    const user: User = { id: found.id, nome: found.nome, usuario: found.usuario };
    const token = btoa(JSON.stringify(user));
    return { token, user };
  },

  me(token: string | null): { user: User } {
    if (!token) throw new Error('Sessão inválida.');
    try {
      const user = JSON.parse(atob(token)) as User;
      if (!user?.id) throw new Error('invalid');
      return { user };
    } catch {
      throw new Error('Sessão inválida.');
    }
  },

  getClientes(): Cliente[] {
    return loadState().clientes.filter((c) => c.ativo === 1);
  },

  createCliente(nome: string, telefone = ''): Cliente {
    const state = loadState();
    const created: Cliente = { id: state.nextIds.cliente++, nome, telefone, ativo: 1 };
    state.clientes.push(created);
    saveState(state);
    return created;
  },

  getAtendentes(): Atendente[] {
    return loadState().atendentes.filter((a) => a.ativo === 1);
  },

  createAtendente(nome: string): Atendente {
    const state = loadState();
    const created: Atendente = { id: state.nextIds.atendente++, nome, ativo: 1 };
    state.atendentes.push(created);
    saveState(state);
    return created;
  },

  getProdutos(q = '', includeInactive = false): Produto[] {
    const state = loadState();
    let list = includeInactive ? state.produtos : state.produtos.filter((p) => p.ativo === 1);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) => p.codigo.toLowerCase().includes(term) || p.nome.toLowerCase().includes(term)
      );
    }
    return [...list].sort((a, b) => {
      if (a.codigo === '-' && b.codigo !== '-') return 1;
      if (a.codigo !== '-' && b.codigo === '-') return -1;
      const numA = Number(a.codigo);
      const numB = Number(b.codigo);
      if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) return numA - numB;
      return a.nome.localeCompare(b.nome);
    });
  },

  createProduto(data: { codigo: string; nome: string; preco: number }): Produto {
    const state = loadState();
    if (data.codigo !== '-' && state.produtos.some((p) => p.ativo === 1 && p.codigo === data.codigo)) {
      throw new Error(`Já existe um produto ativo com o código ${data.codigo}.`);
    }
    const created: Produto = {
      id: state.nextIds.produto++,
      codigo: data.codigo,
      nome: data.nome,
      preco: Number(data.preco.toFixed(2)),
      ativo: 1,
    };
    state.produtos.push(created);
    saveState(state);
    return created;
  },

  updateProduto(
    id: number,
    data: Partial<{ codigo: string; nome: string; preco: number; ativo: boolean }>
  ): Produto {
    const state = loadState();
    const prod = state.produtos.find((p) => p.id === id);
    if (!prod) throw new Error('Produto não encontrado.');
    const nextCodigo = data.codigo ?? prod.codigo;
    const nextAtivo = data.ativo !== undefined ? (data.ativo ? 1 : 0) : prod.ativo;
    if (
      nextAtivo === 1 &&
      nextCodigo !== '-' &&
      state.produtos.some((p) => p.ativo === 1 && p.codigo === nextCodigo && p.id !== id)
    ) {
      throw new Error(`Já existe outro produto ativo com o código ${nextCodigo}.`);
    }
    prod.codigo = nextCodigo;
    if (data.nome !== undefined) prod.nome = data.nome;
    if (data.preco !== undefined) prod.preco = Number(data.preco.toFixed(2));
    prod.ativo = nextAtivo;
    saveState(state);
    return prod;
  },

  getPedidos(status?: string): Pedido[] {
    const state = loadState();
    const allowed = status ? status.split(',').map((s) => s.trim()) : null;
    return state.pedidos
      .filter((p) => (!allowed ? true : allowed.includes(p.status)))
      .sort((a, b) => b.id - a.id)
      .map((p) => {
        const full = hydratePedido(state, p.id);
        return {
          ...full,
          formaPagamento: full.pagamento?.formaPagamento || null,
          valorRecebido: full.pagamento?.valorRecebido ?? null,
          troco: full.pagamento?.troco ?? null,
        };
      });
  },

  getPedido(id: number): Pedido {
    return hydratePedido(loadState(), id);
  },

  createPedido(data: {
    clienteId?: number;
    clienteNome?: string;
    atendenteId: number;
    comentario: string;
    status?: 'PENDENTE' | 'EM_ANDAMENTO';
  }): Pedido {
    const state = loadState();
    let clienteId = data.clienteId ?? 1;
    if (data.clienteNome !== undefined) {
      const nome = data.clienteNome.trim() || 'Cliente Avulso';
      const existing = state.clientes.find(
        (c) => c.ativo === 1 && c.nome.toLowerCase() === nome.toLowerCase()
      );
      if (existing) {
        clienteId = existing.id;
      } else {
        clienteId = state.nextIds.cliente++;
        state.clientes.push({ id: clienteId, nome, telefone: '', ativo: 1 });
      }
    }
    const id = state.nextIds.pedido++;
    state.pedidos.push({
      id,
      clienteId,
      atendenteId: data.atendenteId,
      status: data.status === 'PENDENTE' ? 'PENDENTE' : 'EM_ANDAMENTO',
      dataHoraCriacao: new Date().toISOString(),
      dataHoraFinalizacao: null,
      dataHoraCancelamento: null,
      comentario: data.comentario,
      subtotal: 0,
      acrescimos: 0,
      descontos: 0,
      total: 0,
    });
    saveState(state);
    return hydratePedido(state, id);
  },

  updatePedido(
    id: number,
    data: Partial<{
      clienteId: number;
      clienteNome: string;
      atendenteId: number;
      comentario: string;
      status: 'PENDENTE' | 'EM_ANDAMENTO';
    }>
  ): Pedido {
    const state = loadState();
    const p = state.pedidos.find((row) => row.id === id);
    if (!p) throw new Error('Pedido não encontrado.');
    if (p.status === 'FINALIZADO' || p.status === 'CANCELADO') {
      throw new Error('Não é possível alterar um pedido fechado/cancelado.');
    }
    if (data.clienteNome !== undefined) {
      const nome = data.clienteNome.trim() || 'Cliente Avulso';
      const existing = state.clientes.find(
        (c) => c.ativo === 1 && c.nome.toLowerCase() === nome.toLowerCase()
      );
      if (existing) {
        p.clienteId = existing.id;
      } else {
        const newId = state.nextIds.cliente++;
        state.clientes.push({ id: newId, nome, telefone: '', ativo: 1 });
        p.clienteId = newId;
      }
    } else if (data.clienteId !== undefined) {
      p.clienteId = data.clienteId;
    }
    if (data.atendenteId !== undefined) p.atendenteId = data.atendenteId;
    if (data.comentario !== undefined) p.comentario = data.comentario;
    if (data.status !== undefined) p.status = data.status;
    saveState(state);
    return hydratePedido(state, id);
  },

  addItem(pedidoId: number, produtoId: number, quantidade = 1, customPreco?: number): Pedido {
    const state = loadState();
    const prod = state.produtos.find((p) => p.id === produtoId && p.ativo === 1);
    if (!prod) throw new Error('Produto não encontrado.');
    const precoUnitario = Number((customPreco !== undefined ? customPreco : prod.preco).toFixed(2));
    const existing = state.itens.find(
      (i) => i.pedidoId === pedidoId && i.produtoId === produtoId && i.precoUnitario === precoUnitario
    );
    if (existing) {
      existing.quantidade += quantidade;
      existing.subtotal = Number((existing.quantidade * existing.precoUnitario).toFixed(2));
    } else {
      state.itens.push({
        id: state.nextIds.item++,
        pedidoId,
        produtoId: prod.id,
        codigoProduto: prod.codigo,
        nomeProduto: prod.nome,
        quantidade,
        precoUnitario,
        subtotal: Number((quantidade * precoUnitario).toFixed(2)),
      });
    }
    recalc(state, pedidoId);
    saveState(state);
    return hydratePedido(state, pedidoId);
  },

  updateItem(pedidoId: number, itemId: number, quantidade: number, customPreco?: number): Pedido {
    const state = loadState();
    const item = state.itens.find((i) => i.id === itemId && i.pedidoId === pedidoId);
    if (!item) throw new Error('Item não encontrado.');
    item.quantidade = quantidade;
    if (customPreco !== undefined) item.precoUnitario = Number(customPreco.toFixed(2));
    item.subtotal = Number((item.quantidade * item.precoUnitario).toFixed(2));
    recalc(state, pedidoId);
    saveState(state);
    return hydratePedido(state, pedidoId);
  },

  removeItem(pedidoId: number, itemId: number): Pedido {
    const state = loadState();
    state.itens = state.itens.filter((i) => !(i.id === itemId && i.pedidoId === pedidoId));
    recalc(state, pedidoId);
    saveState(state);
    return hydratePedido(state, pedidoId);
  },

  fecharPedido(pedidoId: number, formaPagamento: FormaPagamento, valorRecebido?: number): Pedido {
    const state = loadState();
    const p = state.pedidos.find((row) => row.id === pedidoId);
    if (!p) throw new Error('Pedido não encontrado.');
    recalc(state, pedidoId);
    const total = p.total;
    const recebido = formaPagamento === 'Dinheiro' ? Number((valorRecebido ?? 0).toFixed(2)) : total;
    if (formaPagamento === 'Dinheiro' && recebido < total) {
      throw new Error('Valor recebido insuficiente.');
    }
    const troco = formaPagamento === 'Dinheiro' ? Number((recebido - total).toFixed(2)) : 0;
    const now = new Date().toISOString();
    p.status = 'FINALIZADO';
    p.dataHoraFinalizacao = now;
    state.pagamentos.push({
      id: state.nextIds.pagamento++,
      pedidoId,
      formaPagamento,
      valorRecebido: recebido,
      troco,
      dataHora: now,
    });
    saveState(state);
    return hydratePedido(state, pedidoId);
  },

  cancelarPedido(pedidoId: number): Pedido {
    const state = loadState();
    const p = state.pedidos.find((row) => row.id === pedidoId);
    if (!p) throw new Error('Pedido não encontrado.');
    p.status = 'CANCELADO';
    p.dataHoraCancelamento = new Date().toISOString();
    saveState(state);
    return hydratePedido(state, pedidoId);
  },

  getHistoricoResumo(): HistoricoResumo {
    const state = loadState();
    const finalizados = state.pedidos.filter((p) => p.status === 'FINALIZADO');
    const map = new Map<string, { quantidade: number; total: number }>();
    for (const p of finalizados) {
      const pg = state.pagamentos.find((x) => x.pedidoId === p.id);
      const forma = pg?.formaPagamento || 'Outros';
      const cur = map.get(forma) || { quantidade: 0, total: 0 };
      cur.quantidade += 1;
      cur.total = Number((cur.total + p.total).toFixed(2));
      map.set(forma, cur);
    }
    return {
      quantidadeFinalizados: finalizados.length,
      totalVendido: Number(finalizados.reduce((acc, p) => acc + p.total, 0).toFixed(2)),
      porFormaPagamento: Array.from(map.entries()).map(([formaPagamento, info]) => ({
        formaPagamento,
        ...info,
      })),
    };
  },
};

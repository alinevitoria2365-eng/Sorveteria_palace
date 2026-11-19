export type PedidoStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';

export type FormaPagamento = 'Dinheiro' | 'Pix' | 'Cartão de débito' | 'Cartão de crédito';

export interface User {
  id: number;
  nome: string;
  usuario: string;
}

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  ativo: number;
}

export interface Atendente {
  id: number;
  nome: string;
  ativo: number;
}

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  preco: number;
  ativo: number;
}

export interface ItemPedido {
  id: number;
  pedidoId: number;
  produtoId: number;
  codigoProduto: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Pagamento {
  id: number;
  pedidoId: number;
  formaPagamento: FormaPagamento;
  valorRecebido: number | null;
  troco: number;
  dataHora: string;
}

export interface Pedido {
  id: number;
  clienteId: number;
  atendenteId: number;
  clienteNome: string;
  clienteTelefone?: string;
  atendenteNome: string;
  status: PedidoStatus;
  dataHoraCriacao: string;
  dataHoraFinalizacao: string | null;
  dataHoraCancelamento: string | null;
  comentario: string;
  subtotal: number;
  acrescimos: number;
  descontos: number;
  total: number;
  totalItens?: number;
  formaPagamento?: FormaPagamento | null;
  valorRecebido?: number | null;
  troco?: number | null;
  itens?: ItemPedido[];
  pagamento?: Pagamento | null;
}

export interface HistoricoResumo {
  quantidadeFinalizados: number;
  totalVendido: number;
  porFormaPagamento: Array<{
    formaPagamento: string;
    quantidade: number;
    total: number;
  }>;
}

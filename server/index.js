import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase, recalcPedidoTotals } from './db.js';
import { createSessionToken, requireAuth, verifyPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

initDatabase();

const app = express();
app.use(express.json());

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'];

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Informe usuário e senha.' });
  }
  const user = db
    .prepare('SELECT id, nome, usuario, senhaHash, ativo FROM usuarios WHERE usuario = ?')
    .get(String(usuario).trim());

  if (!user || !user.ativo || !verifyPassword(String(senha), user.senhaHash)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  const token = createSessionToken(user);
  res.json({
    token,
    user: { id: user.id, nome: user.nome, usuario: user.usuario },
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// --- CLIENTES ---
app.get('/api/clientes', requireAuth, (req, res) => {
  const includeInactive = req.query.includeInactive === '1';
  const rows = includeInactive
    ? db.prepare('SELECT id, nome, telefone, ativo FROM clientes ORDER BY id ASC').all()
    : db.prepare('SELECT id, nome, telefone, ativo FROM clientes WHERE ativo = 1 ORDER BY id ASC').all();
  res.json(rows);
});

app.post('/api/clientes', requireAuth, (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  const telefone = String(req.body?.telefone || '').trim();
  if (!nome) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }
  const result = db.prepare('INSERT INTO clientes (nome, telefone, ativo) VALUES (?, ?, 1)').run(nome, telefone);
  const created = db.prepare('SELECT id, nome, telefone, ativo FROM clientes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// --- ATENDENTES ---
app.get('/api/atendentes', requireAuth, (req, res) => {
  const includeInactive = req.query.includeInactive === '1';
  const rows = includeInactive
    ? db.prepare('SELECT id, nome, ativo FROM atendentes ORDER BY nome ASC').all()
    : db.prepare('SELECT id, nome, ativo FROM atendentes WHERE ativo = 1 ORDER BY nome ASC').all();
  res.json(rows);
});

app.post('/api/atendentes', requireAuth, (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  if (!nome) {
    return res.status(400).json({ error: 'Nome do atendente é obrigatório.' });
  }
  const result = db.prepare('INSERT INTO atendentes (nome, ativo) VALUES (?, 1)').run(nome);
  const created = db.prepare('SELECT id, nome, ativo FROM atendentes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// --- PRODUTOS ---
app.get('/api/produtos', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const includeInactive = req.query.includeInactive === '1';

  if (q) {
    const like = `%${q}%`;
    const rows = db
      .prepare(
        `SELECT id, codigo, nome, preco, ativo
         FROM produtos
         WHERE ativo = 1 AND (codigo = ? OR codigo LIKE ? OR nome LIKE ?)
         ORDER BY CASE WHEN codigo = ? THEN 0 WHEN codigo LIKE ? THEN 1 ELSE 2 END, nome ASC
         LIMIT 30`
      )
      .all(q, `${q}%`, like, q, `${q}%`);
    return res.json(rows);
  }

  const orderClause = "CASE WHEN codigo = '-' THEN 1 ELSE 0 END, CAST(codigo AS INTEGER) ASC, nome ASC";
  const rows = includeInactive
    ? db.prepare(`SELECT id, codigo, nome, preco, ativo FROM produtos ORDER BY ${orderClause}`).all()
    : db.prepare(`SELECT id, codigo, nome, preco, ativo FROM produtos WHERE ativo = 1 ORDER BY ${orderClause}`).all();
  res.json(rows);
});

app.post('/api/produtos', requireAuth, (req, res) => {
  const codigo = String(req.body?.codigo || '').trim();
  const nome = String(req.body?.nome || '').trim();
  const preco = Number(req.body?.preco);

  if (!codigo) return res.status(400).json({ error: 'Código do produto é obrigatório.' });
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
  if (!Number.isFinite(preco) || preco < 0) {
    return res.status(400).json({ error: 'Preço inválido.' });
  }

  if (codigo !== '-') {
    const existing = db.prepare('SELECT id FROM produtos WHERE codigo = ? AND ativo = 1').get(codigo);
    if (existing) {
      return res.status(409).json({ error: `Já existe um produto ativo com o código ${codigo}.` });
    }
  }

  const result = db
    .prepare('INSERT INTO produtos (codigo, nome, preco, ativo) VALUES (?, ?, ?, 1)')
    .run(codigo, nome, Number(preco.toFixed(2)));
  const created = db.prepare('SELECT id, codigo, nome, preco, ativo FROM produtos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/produtos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Produto não encontrado.' });

  const codigo = req.body?.codigo !== undefined ? String(req.body.codigo).trim() : current.codigo;
  const nome = req.body?.nome !== undefined ? String(req.body.nome).trim() : current.nome;
  const preco = req.body?.preco !== undefined ? Number(req.body.preco) : current.preco;
  const ativo = req.body?.ativo !== undefined ? (req.body.ativo ? 1 : 0) : current.ativo;

  if (!codigo || !nome) return res.status(400).json({ error: 'Código e nome são obrigatórios.' });
  if (!Number.isFinite(preco) || preco < 0) return res.status(400).json({ error: 'Preço inválido.' });

  if (ativo === 1 && codigo !== '-') {
    const conflict = db
      .prepare('SELECT id FROM produtos WHERE codigo = ? AND ativo = 1 AND id != ?')
      .get(codigo, id);
    if (conflict) {
      return res.status(409).json({ error: `Já existe outro produto ativo com o código ${codigo}.` });
    }
  }

  db.prepare('UPDATE produtos SET codigo = ?, nome = ?, preco = ?, ativo = ? WHERE id = ?').run(
    codigo,
    nome,
    Number(preco.toFixed(2)),
    ativo,
    id
  );
  const updated = db.prepare('SELECT id, codigo, nome, preco, ativo FROM produtos WHERE id = ?').get(id);
  res.json(updated);
});

// --- PEDIDOS ---
function getPedidoDetalhado(id) {
  const pedido = db
    .prepare(
      `SELECT p.*, c.nome AS clienteNome, c.telefone AS clienteTelefone, a.nome AS atendenteNome
       FROM pedidos p
       JOIN clientes c ON c.id = p.clienteId
       JOIN atendentes a ON a.id = p.atendenteId
       WHERE p.id = ?`
    )
    .get(id);
  if (!pedido) return null;

  const itens = db
    .prepare('SELECT * FROM itens_pedido WHERE pedidoId = ? ORDER BY id ASC')
    .all(id);
  const pagamento = db
    .prepare('SELECT * FROM pagamentos WHERE pedidoId = ? ORDER BY id DESC LIMIT 1')
    .get(id);

  return { ...pedido, itens, pagamento: pagamento || null };
}

app.get('/api/pedidos', requireAuth, (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  let query = `
    SELECT p.*, c.nome AS clienteNome, a.nome AS atendenteNome,
           pg.formaPagamento, pg.valorRecebido, pg.troco, pg.dataHora AS dataHoraPagamento,
           (SELECT COALESCE(SUM(quantidade), 0) FROM itens_pedido i WHERE i.pedidoId = p.id) AS totalItens
    FROM pedidos p
    JOIN clientes c ON c.id = p.clienteId
    JOIN atendentes a ON a.id = p.atendenteId
    LEFT JOIN pagamentos pg ON pg.pedidoId = p.id
  `;
  const params = [];
  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      query += ` WHERE p.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
  }
  query += ' ORDER BY p.id DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.get('/api/pedidos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const pedido = getPedidoDetalhado(id);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
  res.json(pedido);
});

app.post('/api/pedidos', requireAuth, (req, res) => {
  const clienteId = Number(req.body?.clienteId);
  const atendenteId = Number(req.body?.atendenteId);
  const comentario = String(req.body?.comentario || '').trim();
  const requestedStatus = req.body?.status === 'PENDENTE' ? 'PENDENTE' : 'EM_ANDAMENTO';

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return res.status(400).json({ error: 'Selecione um cliente válido.' });
  }
  if (!Number.isInteger(atendenteId) || atendenteId <= 0) {
    return res.status(400).json({ error: 'Selecione um atendente.' });
  }

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ? AND ativo = 1').get(clienteId);
  if (!cliente) return res.status(400).json({ error: 'Cliente inválido ou inativo.' });

  const atendente = db.prepare('SELECT id FROM atendentes WHERE id = ? AND ativo = 1').get(atendenteId);
  if (!atendente) return res.status(400).json({ error: 'Atendente inválido ou inativo.' });

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO pedidos (clienteId, atendenteId, status, dataHoraCriacao, comentario, subtotal, acrescimos, descontos, total)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0)`
    )
    .run(clienteId, atendenteId, requestedStatus, now, comentario);

  const created = getPedidoDetalhado(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/pedidos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: `Não é possível alterar um pedido ${pedido.status.toLowerCase()}.` });
  }

  const clienteId = req.body?.clienteId !== undefined ? Number(req.body.clienteId) : pedido.clienteId;
  const atendenteId = req.body?.atendenteId !== undefined ? Number(req.body.atendenteId) : pedido.atendenteId;
  const comentario = req.body?.comentario !== undefined ? String(req.body.comentario).trim() : pedido.comentario;
  const status =
    req.body?.status && ['PENDENTE', 'EM_ANDAMENTO'].includes(req.body.status)
      ? req.body.status
      : pedido.status;

  const acrescimos = req.body?.acrescimos !== undefined ? Number(req.body.acrescimos) : pedido.acrescimos;
  const descontos = req.body?.descontos !== undefined ? Number(req.body.descontos) : pedido.descontos;

  if (!Number.isInteger(clienteId) || !db.prepare('SELECT id FROM clientes WHERE id = ?').get(clienteId)) {
    return res.status(400).json({ error: 'Cliente inválido.' });
  }
  if (!Number.isInteger(atendenteId) || !db.prepare('SELECT id FROM atendentes WHERE id = ?').get(atendenteId)) {
    return res.status(400).json({ error: 'Atendente inválido.' });
  }
  if (!Number.isFinite(acrescimos) || acrescimos < 0 || !Number.isFinite(descontos) || descontos < 0) {
    return res.status(400).json({ error: 'Acréscimos e descontos devem ser valores válidos não negativos.' });
  }

  db.prepare(
    'UPDATE pedidos SET clienteId = ?, atendenteId = ?, comentario = ?, status = ?, acrescimos = ?, descontos = ? WHERE id = ?'
  ).run(clienteId, atendenteId, comentario, status, Number(acrescimos.toFixed(2)), Number(descontos.toFixed(2)), id);

  recalcPedidoTotals(id);
  res.json(getPedidoDetalhado(id));
});

// --- ITENS DO PEDIDO ---
app.post('/api/pedidos/:id/itens', requireAuth, (req, res) => {
  const pedidoId = Number(req.params.id);
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: `Não é possível adicionar itens a um pedido ${pedido.status.toLowerCase()}.` });
  }

  const produtoId = Number(req.body?.produtoId);
  const quantidade = Number(req.body?.quantidade ?? 1);

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'A quantidade deve ser maior que zero.' });
  }

  const produto = db.prepare('SELECT * FROM produtos WHERE id = ? AND ativo = 1').get(produtoId);
  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado ou inativo.' });
  }

  let precoUnitario = Number(produto.preco.toFixed(2));
  if (produto.codigo === '01' || req.body?.precoUnitario !== undefined) {
    const customPreco = Number(req.body?.precoUnitario);
    if (produto.codigo === '01' && (!Number.isFinite(customPreco) || customPreco <= 0)) {
      return res.status(400).json({ error: 'Informe um preço válido maior que zero para o Self service.' });
    }
    if (Number.isFinite(customPreco) && customPreco >= 0) {
      precoUnitario = Number(customPreco.toFixed(2));
    }
  }

  const existingItem = db
    .prepare('SELECT * FROM itens_pedido WHERE pedidoId = ? AND produtoId = ? AND precoUnitario = ?')
    .get(pedidoId, produto.id, precoUnitario);

  if (existingItem) {
    const novaQtd = existingItem.quantidade + quantidade;
    const novoSubtotal = Number((novaQtd * existingItem.precoUnitario).toFixed(2));
    db.prepare('UPDATE itens_pedido SET quantidade = ?, subtotal = ? WHERE id = ?').run(
      novaQtd,
      novoSubtotal,
      existingItem.id
    );
  } else {
    const subtotal = Number((quantidade * precoUnitario).toFixed(2));
    db.prepare(
      `INSERT INTO itens_pedido (pedidoId, produtoId, codigoProduto, nomeProduto, quantidade, precoUnitario, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(pedidoId, produto.id, produto.codigo, produto.nome, quantidade, precoUnitario, subtotal);
  }

  recalcPedidoTotals(pedidoId);
  res.status(201).json(getPedidoDetalhado(pedidoId));
});

app.put('/api/pedidos/:id/itens/:itemId', requireAuth, (req, res) => {
  const pedidoId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const quantidade = Number(req.body?.quantidade);

  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: `Não é possível alterar um pedido ${pedido.status.toLowerCase()}.` });
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'A quantidade deve ser maior que zero.' });
  }

  const item = db.prepare('SELECT * FROM itens_pedido WHERE id = ? AND pedidoId = ?').get(itemId, pedidoId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado no pedido.' });

  let precoUnitario = item.precoUnitario;
  if (req.body?.precoUnitario !== undefined) {
    const novoPreco = Number(req.body.precoUnitario);
    if (!Number.isFinite(novoPreco) || novoPreco <= 0) {
      return res.status(400).json({ error: 'O preço unitário deve ser maior que zero.' });
    }
    precoUnitario = Number(novoPreco.toFixed(2));
  }

  const subtotal = Number((quantidade * precoUnitario).toFixed(2));
  db.prepare('UPDATE itens_pedido SET quantidade = ?, precoUnitario = ?, subtotal = ? WHERE id = ?').run(
    quantidade,
    precoUnitario,
    subtotal,
    itemId
  );

  recalcPedidoTotals(pedidoId);
  res.json(getPedidoDetalhado(pedidoId));
});

app.delete('/api/pedidos/:id/itens/:itemId', requireAuth, (req, res) => {
  const pedidoId = Number(req.params.id);
  const itemId = Number(req.params.itemId);

  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: `Não é possível alterar um pedido ${pedido.status.toLowerCase()}.` });
  }

  db.prepare('DELETE FROM itens_pedido WHERE id = ? AND pedidoId = ?').run(itemId, pedidoId);
  recalcPedidoTotals(pedidoId);
  res.json(getPedidoDetalhado(pedidoId));
});

// --- FECHAR / FINALIZAR PEDIDO ---
app.post('/api/pedidos/:id/fechar', requireAuth, (req, res) => {
  const pedidoId = Number(req.params.id);
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO') {
    return res.status(400).json({ error: 'Este pedido já foi finalizado.' });
  }
  if (pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: 'Não é possível finalizar um pedido cancelado.' });
  }

  const itemCount = db.prepare('SELECT COUNT(*) AS count FROM itens_pedido WHERE pedidoId = ?').get(pedidoId).count;
  if (itemCount === 0) {
    return res.status(400).json({ error: 'Adicione pelo menos um produto antes de fechar o pedido.' });
  }

  const totals = recalcPedidoTotals(pedidoId);
  const total = totals.total;

  const formaPagamento = String(req.body?.formaPagamento || '').trim();
  if (!PAYMENT_METHODS.includes(formaPagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida.' });
  }

  let valorRecebido = total;
  let troco = 0;

  if (formaPagamento === 'Dinheiro') {
    const recebido = Number(req.body?.valorRecebido);
    if (!Number.isFinite(recebido) || recebido < total) {
      return res.status(400).json({
        error: `Valor recebido insuficiente. O total do pedido é R$ ${total.toFixed(2).replace('.', ',')}.`,
      });
    }
    valorRecebido = Number(recebido.toFixed(2));
    troco = Number((valorRecebido - total).toFixed(2));
  }

  const now = new Date().toISOString();

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE pedidos SET status = ?, dataHoraFinalizacao = ? WHERE id = ?').run(
      'FINALIZADO',
      now,
      pedidoId
    );
    db.prepare(
      'INSERT INTO pagamentos (pedidoId, formaPagamento, valorRecebido, troco, dataHora) VALUES (?, ?, ?, ?, ?)'
    ).run(pedidoId, formaPagamento, valorRecebido, troco, now);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json(getPedidoDetalhado(pedidoId));
});

// --- CANCELAR PEDIDO ---
app.post('/api/pedidos/:id/cancelar', requireAuth, (req, res) => {
  const pedidoId = Number(req.params.id);
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO') {
    return res.status(400).json({ error: 'Não é possível cancelar um pedido já finalizado.' });
  }
  if (pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: 'Este pedido já está cancelado.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE pedidos SET status = ?, dataHoraCancelamento = ? WHERE id = ?').run(
    'CANCELADO',
    now,
    pedidoId
  );

  res.json(getPedidoDetalhado(pedidoId));
});

// --- HISTÓRICO / RESUMO ---
app.get('/api/historico/resumo', requireAuth, (req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS quantidadeFinalizados, COALESCE(SUM(total), 0) AS totalVendido
       FROM pedidos WHERE status = 'FINALIZADO'`
    )
    .get();

  const porFormaPagamento = db
    .prepare(
      `SELECT pg.formaPagamento, COUNT(*) AS quantidade, COALESCE(SUM(p.total), 0) AS total
       FROM pagamentos pg
       JOIN pedidos p ON p.id = pg.pedidoId
       WHERE p.status = 'FINALIZADO'
       GROUP BY pg.formaPagamento`
    )
    .all();

  res.json({
    quantidadeFinalizados: totals.quantidadeFinalizados || 0,
    totalVendido: Number((totals.totalVendido || 0).toFixed(2)),
    porFormaPagamento,
  });
});

// Serve frontend build in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Servidor PDV Sorveteria rodando em http://localhost:${PORT}`);
});

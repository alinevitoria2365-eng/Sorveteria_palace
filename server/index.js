import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getClient, initDatabase, query, recalcPedidoTotals } from './db.js';
import { createSessionToken, requireAuth, verifyPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(express.json());

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'];

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Informe usuário e senha.' });
  }
  const { rows } = await query(
    'SELECT id, nome, usuario, "senhaHash", ativo FROM usuarios WHERE usuario = $1',
    [String(usuario).trim()]
  );
  const user = rows[0];

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
app.get('/api/clientes', requireAuth, async (req, res) => {
  const includeInactive = req.query.includeInactive === '1';
  const { rows } = includeInactive
    ? await query('SELECT id, nome, telefone, ativo FROM clientes ORDER BY id ASC')
    : await query('SELECT id, nome, telefone, ativo FROM clientes WHERE ativo = 1 ORDER BY id ASC');
  res.json(rows);
});

app.post('/api/clientes', requireAuth, async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  const telefone = String(req.body?.telefone || '').trim();
  if (!nome) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }
  const { rows } = await query(
    'INSERT INTO clientes (nome, telefone, ativo) VALUES ($1, $2, 1) RETURNING id, nome, telefone, ativo',
    [nome, telefone]
  );
  res.status(201).json(rows[0]);
});

// --- ATENDENTES ---
app.get('/api/atendentes', requireAuth, async (req, res) => {
  const includeInactive = req.query.includeInactive === '1';
  const { rows } = includeInactive
    ? await query('SELECT id, nome, ativo FROM atendentes ORDER BY nome ASC')
    : await query('SELECT id, nome, ativo FROM atendentes WHERE ativo = 1 ORDER BY nome ASC');
  res.json(rows);
});

app.post('/api/atendentes', requireAuth, async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  if (!nome) {
    return res.status(400).json({ error: 'Nome do atendente é obrigatório.' });
  }
  const { rows } = await query(
    'INSERT INTO atendentes (nome, ativo) VALUES ($1, 1) RETURNING id, nome, ativo',
    [nome]
  );
  res.status(201).json(rows[0]);
});

// --- PRODUTOS ---
app.get('/api/produtos', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const includeInactive = req.query.includeInactive === '1';

  if (q) {
    const like = `%${q}%`;
    const prefix = `${q}%`;
    const { rows } = await query(
      `SELECT id, codigo, nome, preco, ativo
       FROM produtos
       WHERE ativo = 1 AND (codigo = $1 OR codigo ILIKE $2 OR nome ILIKE $3)
       ORDER BY CASE WHEN codigo = $1 THEN 0 WHEN codigo ILIKE $2 THEN 1 ELSE 2 END, nome ASC
       LIMIT 30`,
      [q, prefix, like]
    );
    return res.json(rows);
  }

  const orderClause =
    "CASE WHEN codigo = '-' THEN 1 ELSE 0 END, CASE WHEN codigo ~ '^[0-9]+$' THEN codigo::INTEGER ELSE 999999 END ASC, nome ASC";
  const { rows } = includeInactive
    ? await query(`SELECT id, codigo, nome, preco, ativo FROM produtos ORDER BY ${orderClause}`)
    : await query(
        `SELECT id, codigo, nome, preco, ativo FROM produtos WHERE ativo = 1 ORDER BY ${orderClause}`
      );
  res.json(rows);
});

app.post('/api/produtos', requireAuth, async (req, res) => {
  const codigo = String(req.body?.codigo || '').trim();
  const nome = String(req.body?.nome || '').trim();
  const preco = Number(req.body?.preco);

  if (!codigo) return res.status(400).json({ error: 'Código do produto é obrigatório.' });
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
  if (!Number.isFinite(preco) || preco < 0) {
    return res.status(400).json({ error: 'Preço inválido.' });
  }

  if (codigo !== '-') {
    const { rows: existing } = await query(
      'SELECT id FROM produtos WHERE codigo = $1 AND ativo = 1',
      [codigo]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: `Já existe um produto ativo com o código ${codigo}.` });
    }
  }

  const { rows } = await query(
    'INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ($1, $2, $3, 1) RETURNING id, codigo, nome, preco, ativo',
    [codigo, nome, Number(preco.toFixed(2))]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/produtos/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows: currentRows } = await query('SELECT * FROM produtos WHERE id = $1', [id]);
  const current = currentRows[0];
  if (!current) return res.status(404).json({ error: 'Produto não encontrado.' });

  const codigo = req.body?.codigo !== undefined ? String(req.body.codigo).trim() : current.codigo;
  const nome = req.body?.nome !== undefined ? String(req.body.nome).trim() : current.nome;
  const preco = req.body?.preco !== undefined ? Number(req.body.preco) : Number(current.preco);
  const ativo = req.body?.ativo !== undefined ? (req.body.ativo ? 1 : 0) : current.ativo;

  if (!codigo || !nome) return res.status(400).json({ error: 'Código e nome são obrigatórios.' });
  if (!Number.isFinite(preco) || preco < 0) return res.status(400).json({ error: 'Preço inválido.' });

  if (ativo === 1 && codigo !== '-') {
    const { rows: conflict } = await query(
      'SELECT id FROM produtos WHERE codigo = $1 AND ativo = 1 AND id <> $2',
      [codigo, id]
    );
    if (conflict.length > 0) {
      return res.status(409).json({ error: `Já existe outro produto ativo com o código ${codigo}.` });
    }
  }

  const { rows } = await query(
    'UPDATE produtos SET codigo = $1, nome = $2, preco = $3, ativo = $4 WHERE id = $5 RETURNING id, codigo, nome, preco, ativo',
    [codigo, nome, Number(preco.toFixed(2)), ativo, id]
  );
  res.json(rows[0]);
});

// --- PEDIDOS ---
async function getPedidoDetalhado(id) {
  const { rows: pedidoRows } = await query(
    `SELECT p.*, c.nome AS "clienteNome", c.telefone AS "clienteTelefone", a.nome AS "atendenteNome"
     FROM pedidos p
     JOIN clientes c ON c.id = p."clienteId"
     JOIN atendentes a ON a.id = p."atendenteId"
     WHERE p.id = $1`,
    [id]
  );
  const pedido = pedidoRows[0];
  if (!pedido) return null;

  const { rows: itens } = await query(
    'SELECT * FROM itens_pedido WHERE "pedidoId" = $1 ORDER BY id ASC',
    [id]
  );
  const { rows: pagamentoRows } = await query(
    'SELECT * FROM pagamentos WHERE "pedidoId" = $1 ORDER BY id DESC LIMIT 1',
    [id]
  );

  return { ...pedido, itens, pagamento: pagamentoRows[0] || null };
}

app.get('/api/pedidos', requireAuth, async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  let sql = `
    SELECT p.*, c.nome AS "clienteNome", a.nome AS "atendenteNome",
           pg."formaPagamento", pg."valorRecebido", pg.troco, pg."dataHora" AS "dataHoraPagamento",
           (SELECT COALESCE(SUM(quantidade), 0) FROM itens_pedido i WHERE i."pedidoId" = p.id) AS "totalItens"
    FROM pedidos p
    JOIN clientes c ON c.id = p."clienteId"
    JOIN atendentes a ON a.id = p."atendenteId"
    LEFT JOIN pagamentos pg ON pg."pedidoId" = p.id
  `;
  const params = [];
  if (status) {
    const statuses = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length > 0) {
      const placeholders = statuses.map((_, idx) => `$${idx + 1}`).join(',');
      sql += ` WHERE p.status IN (${placeholders})`;
      params.push(...statuses);
    }
  }
  sql += ' ORDER BY p.id DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
});

app.get('/api/pedidos/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const pedido = await getPedidoDetalhado(id);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
  res.json(pedido);
});

async function resolveClienteId(clienteIdInput, clienteNomeInput) {
  if (clienteNomeInput !== undefined) {
    const nome = String(clienteNomeInput || '').trim() || 'Cliente Avulso';
    const { rows: existing } = await query(
      'SELECT id FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = 1',
      [nome]
    );
    if (existing.length > 0) return existing[0].id;
    const { rows: inserted } = await query(
      'INSERT INTO clientes (nome, telefone, ativo) VALUES ($1, $2, 1) RETURNING id',
      [nome, '']
    );
    return inserted[0].id;
  }
  return Number(clienteIdInput);
}

app.post('/api/pedidos', requireAuth, async (req, res) => {
  const clienteId = await resolveClienteId(req.body?.clienteId, req.body?.clienteNome);
  const atendenteId = Number(req.body?.atendenteId);
  const comentario = String(req.body?.comentario || '').trim();
  const requestedStatus = req.body?.status === 'PENDENTE' ? 'PENDENTE' : 'EM_ANDAMENTO';

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return res.status(400).json({ error: 'Informe um cliente válido.' });
  }
  if (!Number.isInteger(atendenteId) || atendenteId <= 0) {
    return res.status(400).json({ error: 'Selecione um atendente.' });
  }

  const { rows: clienteRows } = await query('SELECT id FROM clientes WHERE id = $1 AND ativo = 1', [
    clienteId,
  ]);
  if (clienteRows.length === 0) return res.status(400).json({ error: 'Cliente inválido ou inativo.' });

  const { rows: atendenteRows } = await query(
    'SELECT id FROM atendentes WHERE id = $1 AND ativo = 1',
    [atendenteId]
  );
  if (atendenteRows.length === 0) {
    return res.status(400).json({ error: 'Atendente inválido ou inativo.' });
  }

  const now = new Date().toISOString();
  const { rows: inserted } = await query(
    `INSERT INTO pedidos ("clienteId", "atendenteId", status, "dataHoraCriacao", comentario, subtotal, acrescimos, descontos, total)
     VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0)
     RETURNING id`,
    [clienteId, atendenteId, requestedStatus, now, comentario]
  );

  const created = await getPedidoDetalhado(inserted[0].id);
  res.status(201).json(created);
});

app.put('/api/pedidos/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows: pedidoRows } = await query('SELECT * FROM pedidos WHERE id = $1', [id]);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res
      .status(400)
      .json({ error: `Não é possível alterar um pedido ${pedido.status.toLowerCase()}.` });
  }

  const clienteId =
    req.body?.clienteNome !== undefined
      ? await resolveClienteId(undefined, req.body.clienteNome)
      : req.body?.clienteId !== undefined
      ? Number(req.body.clienteId)
      : pedido.clienteId;
  const atendenteId =
    req.body?.atendenteId !== undefined ? Number(req.body.atendenteId) : pedido.atendenteId;
  const comentario =
    req.body?.comentario !== undefined ? String(req.body.comentario).trim() : pedido.comentario;
  const status =
    req.body?.status && ['PENDENTE', 'EM_ANDAMENTO'].includes(req.body.status)
      ? req.body.status
      : pedido.status;

  const acrescimos =
    req.body?.acrescimos !== undefined ? Number(req.body.acrescimos) : Number(pedido.acrescimos);
  const descontos =
    req.body?.descontos !== undefined ? Number(req.body.descontos) : Number(pedido.descontos);

  if (!Number.isInteger(clienteId)) {
    return res.status(400).json({ error: 'Cliente inválido.' });
  }
  const { rows: clienteCheck } = await query('SELECT id FROM clientes WHERE id = $1', [clienteId]);
  if (clienteCheck.length === 0) {
    return res.status(400).json({ error: 'Cliente inválido.' });
  }

  if (!Number.isInteger(atendenteId)) {
    return res.status(400).json({ error: 'Atendente inválido.' });
  }
  const { rows: atendenteCheck } = await query('SELECT id FROM atendentes WHERE id = $1', [
    atendenteId,
  ]);
  if (atendenteCheck.length === 0) {
    return res.status(400).json({ error: 'Atendente inválido.' });
  }

  if (
    !Number.isFinite(acrescimos) ||
    acrescimos < 0 ||
    !Number.isFinite(descontos) ||
    descontos < 0
  ) {
    return res
      .status(400)
      .json({ error: 'Acréscimos e descontos devem ser valores válidos não negativos.' });
  }

  await query(
    'UPDATE pedidos SET "clienteId" = $1, "atendenteId" = $2, comentario = $3, status = $4, acrescimos = $5, descontos = $6 WHERE id = $7',
    [
      clienteId,
      atendenteId,
      comentario,
      status,
      Number(acrescimos.toFixed(2)),
      Number(descontos.toFixed(2)),
      id,
    ]
  );

  await recalcPedidoTotals(id);
  res.json(await getPedidoDetalhado(id));
});

// --- ITENS DO PEDIDO ---
app.post('/api/pedidos/:id/itens', requireAuth, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { rows: pedidoRows } = await query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res
      .status(400)
      .json({ error: `Não é possível adicionar itens a um pedido ${pedido.status.toLowerCase()}.` });
  }

  const produtoId = Number(req.body?.produtoId);
  const quantidade = Number(req.body?.quantidade ?? 1);

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'A quantidade deve ser maior que zero.' });
  }

  const { rows: produtoRows } = await query(
    'SELECT * FROM produtos WHERE id = $1 AND ativo = 1',
    [produtoId]
  );
  const produto = produtoRows[0];
  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado ou inativo.' });
  }

  let precoUnitario = Number(Number(produto.preco).toFixed(2));
  if (produto.codigo === '01' || req.body?.precoUnitario !== undefined) {
    const customPreco = Number(req.body?.precoUnitario);
    if (produto.codigo === '01' && (!Number.isFinite(customPreco) || customPreco <= 0)) {
      return res
        .status(400)
        .json({ error: 'Informe um preço válido maior que zero para o Self service.' });
    }
    if (Number.isFinite(customPreco) && customPreco >= 0) {
      precoUnitario = Number(customPreco.toFixed(2));
    }
  }

  const { rows: existingItems } = await query(
    'SELECT * FROM itens_pedido WHERE "pedidoId" = $1 AND "produtoId" = $2 AND "precoUnitario" = $3',
    [pedidoId, produto.id, precoUnitario]
  );
  const existingItem = existingItems[0];

  if (existingItem) {
    const novaQtd = existingItem.quantidade + quantidade;
    const novoSubtotal = Number((novaQtd * Number(existingItem.precoUnitario)).toFixed(2));
    await query('UPDATE itens_pedido SET quantidade = $1, subtotal = $2 WHERE id = $3', [
      novaQtd,
      novoSubtotal,
      existingItem.id,
    ]);
  } else {
    const subtotal = Number((quantidade * precoUnitario).toFixed(2));
    await query(
      `INSERT INTO itens_pedido ("pedidoId", "produtoId", "codigoProduto", "nomeProduto", quantidade, "precoUnitario", subtotal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [pedidoId, produto.id, produto.codigo, produto.nome, quantidade, precoUnitario, subtotal]
    );
  }

  await recalcPedidoTotals(pedidoId);
  res.status(201).json(await getPedidoDetalhado(pedidoId));
});

app.put('/api/pedidos/:id/itens/:itemId', requireAuth, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const quantidade = Number(req.body?.quantidade);

  const { rows: pedidoRows } = await query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res
      .status(400)
      .json({ error: `Não é possível alterar um pedido ${pedido.status.toLowerCase()}.` });
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'A quantidade deve ser maior que zero.' });
  }

  const { rows: itemRows } = await query(
    'SELECT * FROM itens_pedido WHERE id = $1 AND "pedidoId" = $2',
    [itemId, pedidoId]
  );
  const item = itemRows[0];
  if (!item) return res.status(404).json({ error: 'Item não encontrado no pedido.' });

  let precoUnitario = Number(item.precoUnitario);
  if (req.body?.precoUnitario !== undefined) {
    const novoPreco = Number(req.body.precoUnitario);
    if (!Number.isFinite(novoPreco) || novoPreco <= 0) {
      return res.status(400).json({ error: 'O preço unitário deve ser maior que zero.' });
    }
    precoUnitario = Number(novoPreco.toFixed(2));
  }

  const subtotal = Number((quantidade * precoUnitario).toFixed(2));
  await query(
    'UPDATE itens_pedido SET quantidade = $1, "precoUnitario" = $2, subtotal = $3 WHERE id = $4',
    [quantidade, precoUnitario, subtotal, itemId]
  );

  await recalcPedidoTotals(pedidoId);
  res.json(await getPedidoDetalhado(pedidoId));
});

app.delete('/api/pedidos/:id/itens/:itemId', requireAuth, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const itemId = Number(req.params.itemId);

  const { rows: pedidoRows } = await query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
    return res
      .status(400)
      .json({ error: `Não é possível alterar um pedido ${pedido.status.toLowerCase()}.` });
  }

  await query('DELETE FROM itens_pedido WHERE id = $1 AND "pedidoId" = $2', [itemId, pedidoId]);
  await recalcPedidoTotals(pedidoId);
  res.json(await getPedidoDetalhado(pedidoId));
});

// --- FECHAR / FINALIZAR PEDIDO ---
app.post('/api/pedidos/:id/fechar', requireAuth, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { rows: pedidoRows } = await query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO') {
    return res.status(400).json({ error: 'Este pedido já foi finalizado.' });
  }
  if (pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: 'Não é possível finalizar um pedido cancelado.' });
  }

  const { rows: countRows } = await query(
    'SELECT COUNT(*) AS count FROM itens_pedido WHERE "pedidoId" = $1',
    [pedidoId]
  );
  if (countRows[0].count === 0) {
    return res
      .status(400)
      .json({ error: 'Adicione pelo menos um produto antes de fechar o pedido.' });
  }

  const totals = await recalcPedidoTotals(pedidoId);
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
  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE pedidos SET status = $1, "dataHoraFinalizacao" = $2 WHERE id = $3',
      ['FINALIZADO', now, pedidoId]
    );
    await client.query(
      'INSERT INTO pagamentos ("pedidoId", "formaPagamento", "valorRecebido", troco, "dataHora") VALUES ($1, $2, $3, $4, $5)',
      [pedidoId, formaPagamento, valorRecebido, troco, now]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json(await getPedidoDetalhado(pedidoId));
});

// --- CANCELAR PEDIDO ---
app.post('/api/pedidos/:id/cancelar', requireAuth, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { rows: pedidoRows } = await query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  if (pedido.status === 'FINALIZADO') {
    return res.status(400).json({ error: 'Não é possível cancelar um pedido já finalizado.' });
  }
  if (pedido.status === 'CANCELADO') {
    return res.status(400).json({ error: 'Este pedido já está cancelado.' });
  }

  const now = new Date().toISOString();
  await query(
    'UPDATE pedidos SET status = $1, "dataHoraCancelamento" = $2 WHERE id = $3',
    ['CANCELADO', now, pedidoId]
  );

  res.json(await getPedidoDetalhado(pedidoId));
});

// --- HISTÓRICO / RESUMO ---
app.get('/api/historico/resumo', requireAuth, async (req, res) => {
  const { rows: totalsRows } = await query(
    `SELECT COUNT(*) AS "quantidadeFinalizados", COALESCE(SUM(total), 0) AS "totalVendido"
     FROM pedidos WHERE status = 'FINALIZADO'`
  );

  const { rows: porFormaPagamento } = await query(
    `SELECT pg."formaPagamento", COUNT(*) AS quantidade, COALESCE(SUM(p.total), 0) AS total
     FROM pagamentos pg
     JOIN pedidos p ON p.id = pg."pedidoId"
     WHERE p.status = 'FINALIZADO'
     GROUP BY pg."formaPagamento"`
  );

  const totals = totalsRows[0] || {};
  res.json({
    quantidadeFinalizados: totals.quantidadeFinalizados || 0,
    totalVendido: Number((Number(totals.totalVendido) || 0).toFixed(2)),
    porFormaPagamento,
  });
});

// Tratamento global de erros
app.use((err, _req, res, _next) => {
  console.error('Erro na API:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
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

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Servidor PDV Sorveteria rodando em http://localhost:${PORT} (PostgreSQL)`);
    });
  } catch (err) {
    console.error('Falha ao conectar/inicializar o PostgreSQL:', err.message);
    console.error('Verifique se o PostgreSQL está rodando e se o arquivo .env está configurado (veja .env.example).');
    process.exit(1);
  }
}

startServer();

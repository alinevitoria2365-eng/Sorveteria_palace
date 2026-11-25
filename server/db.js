import 'dotenv/config';
import pg from 'pg';
import { hashPassword } from './auth.js';

const { Pool, types } = pg;

// Retorna NUMERIC/DECIMAL (OID 1700) e BIGINT/COUNT (OID 20) como numbers JS
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

function buildPoolConfig() {
  const useSsl =
    process.env.PGSSL === 'true' ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));

  const sslConfig = useSsl ? { rejectUnauthorized: false } : undefined;

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ...(sslConfig ? { ssl: sslConfig } : {}),
    };
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'sorveteria_pdv',
    ...(sslConfig ? { ssl: sslConfig } : {}),
  };
}

export const pool = new Pool(buildPoolConfig());

export function query(text, params = []) {
  return pool.query(text, params);
}

export function getClient() {
  return pool.connect();
}

export async function initDatabase() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // Se o servidor PostgreSQL estiver rodando mas o banco ainda não existir (3D000), cria automaticamente
    if (err?.code === '3D000' && !process.env.DATABASE_URL) {
      const dbName = process.env.PGDATABASE || 'sorveteria_pdv';
      const adminPool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: 'postgres',
      });
      try {
        await adminPool.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
      } finally {
        await adminPool.end();
      }
    } else {
      throw err;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      usuario TEXT NOT NULL UNIQUE,
      "senhaHash" TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS atendentes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      codigo TEXT NOT NULL,
      nome TEXT NOT NULL,
      preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_ativo
      ON produtos (codigo)
      WHERE ativo = 1 AND codigo <> '-';

    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      "clienteId" INTEGER NOT NULL REFERENCES clientes(id),
      "atendenteId" INTEGER NOT NULL REFERENCES atendentes(id),
      status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO')),
      "dataHoraCriacao" TEXT NOT NULL,
      "dataHoraFinalizacao" TEXT,
      "dataHoraCancelamento" TEXT,
      comentario TEXT DEFAULT '',
      subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
      acrescimos NUMERIC(10, 2) NOT NULL DEFAULT 0,
      descontos NUMERIC(10, 2) NOT NULL DEFAULT 0,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS itens_pedido (
      id SERIAL PRIMARY KEY,
      "pedidoId" INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      "produtoId" INTEGER NOT NULL REFERENCES produtos(id),
      "codigoProduto" TEXT NOT NULL,
      "nomeProduto" TEXT NOT NULL,
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      "precoUnitario" NUMERIC(10, 2) NOT NULL CHECK ("precoUnitario" >= 0),
      subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id SERIAL PRIMARY KEY,
      "pedidoId" INTEGER NOT NULL REFERENCES pedidos(id),
      "formaPagamento" TEXT NOT NULL,
      "valorRecebido" NUMERIC(10, 2),
      troco NUMERIC(10, 2) DEFAULT 0,
      "dataHora" TEXT NOT NULL
    );
  `);

  await seedInitialData();
}

async function seedInitialData() {
  const { rows: userCountRows } = await pool.query('SELECT COUNT(*) AS count FROM usuarios');
  if (userCountRows[0].count === 0) {
    await pool.query(
      'INSERT INTO usuarios (nome, usuario, "senhaHash", ativo) VALUES ($1, $2, $3, 1)',
      ['Administrador', 'admin', hashPassword('123456')]
    );
    await pool.query(
      'INSERT INTO usuarios (nome, usuario, "senhaHash", ativo) VALUES ($1, $2, $3, 1)',
      ['Operador Balcão', 'balcao', hashPassword('123456')]
    );
  }

  const { rows: clientCountRows } = await pool.query('SELECT COUNT(*) AS count FROM clientes');
  if (clientCountRows[0].count === 0) {
    const seedClients = [
      ['Cliente Avulso', ''],
      ['João Pedro', '(11) 99876-5432'],
      ['Maria Clara', '(11) 99123-4567'],
      ['Lucas Oliveira', '(11) 98765-4321'],
      ['Fernanda Costa', '(11) 98456-7890'],
    ];
    for (const [nome, telefone] of seedClients) {
      await pool.query('INSERT INTO clientes (nome, telefone, ativo) VALUES ($1, $2, 1)', [
        nome,
        telefone,
      ]);
    }
  }

  // Garantir atendentes fixos e desativar os antigos de exemplo
  await pool.query(
    "UPDATE atendentes SET ativo = 0 WHERE nome IN ('Ana Paula', 'Carlos Eduardo', 'Mariana Silva')"
  );

  const atendentesFixos = ['Adriano', 'Gabi', 'Tânia', 'Yasmin', 'Cris', 'Aline'];
  for (const nomeAt of atendentesFixos) {
    const { rows: existingAt } = await pool.query('SELECT id FROM atendentes WHERE nome = $1', [
      nomeAt,
    ]);
    if (existingAt.length > 0) {
      await pool.query('UPDATE atendentes SET ativo = 1 WHERE id = $1', [existingAt[0].id]);
    } else {
      await pool.query('INSERT INTO atendentes (nome, ativo) VALUES ($1, 1)', [nomeAt]);
    }
  }

  const { rows: productCountRows } = await pool.query('SELECT COUNT(*) AS count FROM produtos');
  if (productCountRows[0].count === 0) {
    const seedProducts = [
      ['01', 'Self service', 0],
      ['12', 'Banana split', 25.0],
      ['13', 'Refrigerante Lata', 6.5],
      ['14', 'Café gelado', 15.0],
      ['15', 'Capuccino', 18.0],
      ['16', 'Cascão 1 bola', 9.0],
      ['17', 'Cascão 2 bolas', 14.0],
      ['18', 'Cascão pacote', 9.0],
      ['23', 'Cestinha Recheada 1 bola', 9.0],
      ['25', 'Colegial', 18.0],
      ['26', 'Sundae Especial', 17.0],
      ['31', 'Picolé Pistache/Brigadeiro', 5.0],
      ['32', 'Picolé Skimo/Tentação', 4.0],
      ['33', 'Picolé', 2.0],
      ['50', 'Milk Shake pequeno', 13.0],
      ['51', 'Milk Shake Médio', 16.0],
      ['52', 'Milk Shake Grande', 22.0],
      ['53', 'Caixa 5 litros - tradicional', 100.0],
      ['54', 'Mini cobertura', 15.0],
      ['60', 'Casquinha 1 bola', 11.5],
      ['61', 'Casquinha pacote', 5.0],
      ['62', 'Cestinha gourmet', 25.0],
      ['71', 'Morango split', 26.0],
      ['90', 'Água c/ gás', 4.0],
      ['91', 'Água Mineral 500ml', 3.5],
      ['92', 'Petit Gateau com Sorvete', 24.0],
      ['100', 'Adicional cobertura 1', 1.0],
      ['200', 'Adicional cobertura 2', 2.0],
      ['300', 'Caldo', 14.0],
      ['333', 'Picolé Açaí/Ninho', 2.5],
      ['-', 'Caixa 5 litros - trufado/recheado', 120.0],
      ['-', 'Caixa 10 litros', 140.0],
      ['-', 'Milk shake - taça', 16.0],
      ['-', 'Adicional cereja / paçoca', 1.0],
      ['-', 'Adicional confete', 3.0],
      ['-', 'Casquinha/Cestinha/Cascão/Palito/canudo biju recheado (unidade)', 1.0],
    ];
    for (const [codigo, nome, preco] of seedProducts) {
      await pool.query(
        'INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ($1, $2, $3, 1)',
        [codigo, nome, preco]
      );
    }
  }
}

export async function recalcPedidoTotals(pedidoId, client = pool) {
  const { rows: sumRows } = await client.query(
    'SELECT COALESCE(SUM(subtotal), 0) AS soma FROM itens_pedido WHERE "pedidoId" = $1',
    [pedidoId]
  );
  const { rows: pedidoRows } = await client.query(
    'SELECT acrescimos, descontos FROM pedidos WHERE id = $1',
    [pedidoId]
  );
  if (pedidoRows.length === 0) return null;

  const subtotal = Number((Number(sumRows[0].soma) || 0).toFixed(2));
  const acrescimos = Number((Number(pedidoRows[0].acrescimos) || 0).toFixed(2));
  const descontos = Number((Number(pedidoRows[0].descontos) || 0).toFixed(2));
  const total = Number(Math.max(0, subtotal + acrescimos - descontos).toFixed(2));

  await client.query('UPDATE pedidos SET subtotal = $1, total = $2 WHERE id = $3', [
    subtotal,
    total,
    pedidoId,
  ]);
  return { subtotal, acrescimos, descontos, total };
}

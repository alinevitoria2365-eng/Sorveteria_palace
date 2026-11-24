import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'sorveteria.db');

export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      usuario TEXT NOT NULL UNIQUE,
      senhaHash TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS atendentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL CHECK (preco >= 0),
      ativo INTEGER NOT NULL DEFAULT 1
    );

    DROP INDEX IF EXISTS idx_produtos_codigo_ativo;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_ativo
      ON produtos (codigo)
      WHERE ativo = 1 AND codigo != '-';

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER NOT NULL,
      atendenteId INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO')),
      dataHoraCriacao TEXT NOT NULL,
      dataHoraFinalizacao TEXT,
      dataHoraCancelamento TEXT,
      comentario TEXT DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      acrescimos REAL NOT NULL DEFAULT 0,
      descontos REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (clienteId) REFERENCES clientes(id),
      FOREIGN KEY (atendenteId) REFERENCES atendentes(id)
    );

    CREATE TABLE IF NOT EXISTS itens_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedidoId INTEGER NOT NULL,
      produtoId INTEGER NOT NULL,
      codigoProduto TEXT NOT NULL,
      nomeProduto TEXT NOT NULL,
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      precoUnitario REAL NOT NULL CHECK (precoUnitario >= 0),
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE,
      FOREIGN KEY (produtoId) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedidoId INTEGER NOT NULL,
      formaPagamento TEXT NOT NULL,
      valorRecebido REAL,
      troco REAL DEFAULT 0,
      dataHora TEXT NOT NULL,
      FOREIGN KEY (pedidoId) REFERENCES pedidos(id)
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM usuarios').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO usuarios (nome, usuario, senhaHash, ativo) VALUES (?, ?, ?, 1)'
    );
    insertUser.run('Administrador', 'admin', hashPassword('123456'));
    insertUser.run('Operador Balcão', 'balcao', hashPassword('123456'));
  }

  const clientCount = db.prepare('SELECT COUNT(*) AS count FROM clientes').get().count;
  if (clientCount === 0) {
    const insertClient = db.prepare(
      'INSERT INTO clientes (nome, telefone, ativo) VALUES (?, ?, 1)'
    );
    insertClient.run('Cliente Avulso', '');
    insertClient.run('João Pedro', '(11) 99876-5432');
    insertClient.run('Maria Clara', '(11) 99123-4567');
    insertClient.run('Lucas Oliveira', '(11) 98765-4321');
    insertClient.run('Fernanda Costa', '(11) 98456-7890');
  }

  const attendantCount = db.prepare('SELECT COUNT(*) AS count FROM atendentes').get().count;
  if (attendantCount === 0) {
    const insertAttendant = db.prepare(
      'INSERT INTO atendentes (nome, ativo) VALUES (?, 1)'
    );
    insertAttendant.run('Ana Paula');
    insertAttendant.run('Carlos Eduardo');
    insertAttendant.run('Mariana Silva');
  }

  const productCount = db.prepare('SELECT COUNT(*) AS count FROM produtos').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(
      'INSERT INTO produtos (codigo, nome, preco, ativo) VALUES (?, ?, ?, 1)'
    );
    const seedProducts = [
      ['300', 'Caldo', 14.00],
      ['50', 'Milkshake 400ml', 18.50],
      ['16', 'Cascão 1 bola', 9.00],
      ['17', 'Cascão 2 bolas', 14.00],
      ['60', 'Casquinha 1 bola', 11.50],
      ['92', 'Petit Gateau com Sorvete', 24.00],
      ['90', 'Água c/ gás', 4.00],
      ['91', 'Água Mineral 500ml', 3.50],
      ['12', 'Refrigerante Lata', 6.50],
      ['25', 'Sundae Especial', 17.00],
      ['33', 'Picolé', 2.00],
      ['32', 'Picolé Skimo/Tentação', 4.00],
      ['31', 'Picolé Pistache/Brigadeiro', 5.00],
    ];
    for (const [codigo, nome, preco] of seedProducts) {
      insertProduct.run(codigo, nome, preco);
    }
  }

  // Garantir item fixo 01 - Self service
  const selfService = db.prepare("SELECT id FROM produtos WHERE codigo = '01' AND ativo = 1").get();
  if (!selfService) {
    db.prepare("INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ('01', 'Self service', 0, 1)").run();
  }

  // Garantir item fixo 90 - Água c/ gás (R$ 4,00)
  const existing90 = db.prepare("SELECT id, nome FROM produtos WHERE codigo = '90' AND ativo = 1").get();
  if (existing90 && existing90.nome !== 'Água c/ gás') {
    const has92 = db.prepare("SELECT id FROM produtos WHERE codigo = '92' AND ativo = 1").get();
    if (!has92) {
      db.prepare("UPDATE produtos SET codigo = '92' WHERE id = ?").run(existing90.id);
    } else {
      db.prepare("UPDATE produtos SET ativo = 0 WHERE id = ?").run(existing90.id);
    }
  }
  const aguaComGas = db.prepare("SELECT id FROM produtos WHERE codigo = '90' AND ativo = 1").get();
  if (aguaComGas) {
    db.prepare("UPDATE produtos SET nome = 'Água c/ gás', preco = 4.00, ativo = 1 WHERE id = ?").run(aguaComGas.id);
  } else {
    db.prepare("INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ('90', 'Água c/ gás', 4.00, 1)").run();
  }

  // Garantir item fixo 91 - Água Mineral 500ml (R$ 3,50)
  const agua = db.prepare("SELECT id FROM produtos WHERE nome = 'Água Mineral 500ml' OR codigo = '91'").get();
  if (agua) {
    db.prepare("UPDATE produtos SET codigo = '91', nome = 'Água Mineral 500ml', preco = 3.50, ativo = 1 WHERE id = ?").run(
      agua.id
    );
  } else {
    db.prepare("INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ('91', 'Água Mineral 500ml', 3.50, 1)").run();
  }

  // Atualizar nomes de Sorvete 1/2 Bolas para Cascão 1/2 bolas
  db.prepare("UPDATE produtos SET nome = 'Cascão 1 bola' WHERE codigo = '16' OR nome = 'Sorvete 1 Bola'").run();
  db.prepare("UPDATE produtos SET nome = 'Cascão 2 bolas', preco = 14.00 WHERE codigo = '17' OR nome = 'Sorvete 2 Bolas'").run();

  // Mudar Casquinha Recheada para 60 - Casquinha 1 bola
  const existing60 = db.prepare("SELECT id, nome FROM produtos WHERE codigo = '60' AND ativo = 1").get();
  if (existing60 && existing60.nome !== 'Casquinha 1 bola' && existing60.nome !== 'Casquinha Recheada') {
    const has61 = db.prepare("SELECT id FROM produtos WHERE codigo = '61' AND ativo = 1").get();
    if (!has61) {
      db.prepare("UPDATE produtos SET codigo = '61' WHERE id = ?").run(existing60.id);
    } else {
      db.prepare("UPDATE produtos SET ativo = 0 WHERE id = ?").run(existing60.id);
    }
  }
  const casquinha = db
    .prepare("SELECT id FROM produtos WHERE nome IN ('Casquinha Recheada', 'Casquinha 1 bola') OR codigo = '60'")
    .get();
  if (casquinha) {
    db.prepare("UPDATE produtos SET codigo = '60', nome = 'Casquinha 1 bola', ativo = 1 WHERE id = ?").run(
      casquinha.id
    );
  }

  // Remover/desativar Açaí 300ml
  db.prepare("UPDATE produtos SET ativo = 0 WHERE nome = 'Açaí 300ml'").run();

  // Atualizar Picolé Tradicional para 33 - Picolé (R$ 2,00)
  const picole = db
    .prepare("SELECT id FROM produtos WHERE nome IN ('Picolé Tradicional', 'Picolé') OR codigo = '33'")
    .get();
  if (picole) {
    db.prepare("UPDATE produtos SET codigo = '33', nome = 'Picolé', preco = 2.00, ativo = 1 WHERE id = ?").run(
      picole.id
    );
  } else {
    db.prepare("INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ('33', 'Picolé', 2.00, 1)").run();
  }

  // Atualizar Picolé Recheado para 32 - Picolé Skimo/Tentação (R$ 4,00)
  const picoleSkimo = db
    .prepare("SELECT id FROM produtos WHERE nome IN ('Picolé Recheado', 'Picolé Skimo/Tentação') OR codigo = '32'")
    .get();
  if (picoleSkimo) {
    db.prepare(
      "UPDATE produtos SET codigo = '32', nome = 'Picolé Skimo/Tentação', preco = 4.00, ativo = 1 WHERE id = ?"
    ).run(picoleSkimo.id);
  } else {
    db.prepare(
      "INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ('32', 'Picolé Skimo/Tentação', 4.00, 1)"
    ).run();
  }

  // Garantir item 31 - Picolé Pistache/Brigadeiro
  const picole31 = db.prepare("SELECT id FROM produtos WHERE codigo = '31' AND ativo = 1").get();
  if (!picole31) {
    db.prepare(
      "INSERT INTO produtos (codigo, nome, preco, ativo) VALUES ('31', 'Picolé Pistache/Brigadeiro', 5.00, 1)"
    ).run();
  }

  // Mover Sundae Especial de 25 para 26 se necessário para liberar código 25 para Colegial
  const sundae25 = db.prepare("SELECT id, nome FROM produtos WHERE codigo = '25' AND ativo = 1").get();
  if (sundae25 && sundae25.nome === 'Sundae Especial') {
    const has26 = db.prepare("SELECT id FROM produtos WHERE codigo = '26' AND ativo = 1").get();
    if (!has26) {
      db.prepare("UPDATE produtos SET codigo = '26' WHERE id = ?").run(sundae25.id);
    } else {
      db.prepare("UPDATE produtos SET ativo = 0 WHERE id = ?").run(sundae25.id);
    }
  }

  // Mover Refrigerante Lata de 12 para 13 se necessário para liberar código 12 para Banana split
  const refri12 = db.prepare("SELECT id, nome FROM produtos WHERE codigo = '12' AND ativo = 1").get();
  if (refri12 && refri12.nome === 'Refrigerante Lata') {
    const has13 = db.prepare("SELECT id FROM produtos WHERE codigo = '13' AND ativo = 1").get();
    if (!has13) {
      db.prepare("UPDATE produtos SET codigo = '13' WHERE id = ?").run(refri12.id);
    } else {
      db.prepare("UPDATE produtos SET ativo = 0 WHERE id = ?").run(refri12.id);
    }
  }

  // Novos itens fixos
  const novosItensFixos = [
    ['62', 'Cestinha gourmet', 25.00],
    ['61', 'Casquinha pacote', 5.00],
    ['15', 'Capuccino', 18.00],
    ['25', 'Colegial', 18.00],
    ['18', 'Cascão pacote', 9.00],
    ['23', 'Cestinha Recheada 1 bola', 9.00],
    ['14', 'Café gelado', 15.00],
    ['54', 'Mini cobertura', 15.00],
    ['53', 'Caixa 5 litros - tradicional', 100.00],
    ['-', 'Caixa 5 litros - trufado/recheado', 120.00],
    ['-', 'Caixa 10 litros', 140.00],
    ['50', 'Milk Shake pequeno', 13.00],
    ['51', 'Milk Shake Médio', 16.00],
    ['52', 'Milk Shake Grande', 22.00],
    ['-', 'Milk shake - taça', 16.00],
    ['-', 'Adicional cereja / paçoca', 1.00],
    ['-', 'Adicional confete', 3.00],
    ['100', 'Adicional cobertura 1', 1.00],
    ['200', 'Adicional cobertura 2', 2.00],
    ['12', 'Banana split', 25.00],
    ['71', 'Morango split', 26.00],
    ['-', 'Casquinha/Cestinha/Cascão/Palito/canudo biju recheado (unidade)', 1.00],
  ];

  for (const [cod, nom, prc] of novosItensFixos) {
    const found =
      cod === '-'
        ? db.prepare('SELECT id FROM produtos WHERE nome = ? AND ativo = 1').get(nom)
        : db.prepare('SELECT id FROM produtos WHERE (codigo = ? OR nome = ?) AND ativo = 1').get(cod, nom);
    if (found) {
      db.prepare('UPDATE produtos SET codigo = ?, nome = ?, preco = ?, ativo = 1 WHERE id = ?').run(
        cod,
        nom,
        prc,
        found.id
      );
    } else {
      db.prepare('INSERT INTO produtos (codigo, nome, preco, ativo) VALUES (?, ?, ?, 1)').run(
        cod,
        nom,
        prc
      );
    }
  }
}

export function recalcPedidoTotals(pedidoId) {
  const row = db
    .prepare('SELECT COALESCE(SUM(subtotal), 0) AS soma FROM itens_pedido WHERE pedidoId = ?')
    .get(pedidoId);
  const pedido = db.prepare('SELECT acrescimos, descontos FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return null;

  const subtotal = Number((row.soma || 0).toFixed(2));
  const acrescimos = Number((pedido.acrescimos || 0).toFixed(2));
  const descontos = Number((pedido.descontos || 0).toFixed(2));
  const total = Number(Math.max(0, subtotal + acrescimos - descontos).toFixed(2));

  db.prepare('UPDATE pedidos SET subtotal = ?, total = ? WHERE id = ?').run(subtotal, total, pedidoId);
  return { subtotal, acrescimos, descontos, total };
}

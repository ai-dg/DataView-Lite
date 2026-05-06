/**
 * Generates / regenerates the SQLite demo databases used to prove DataView Lite
 * is fully generic across business domains.
 *
 * Personas (from test.pdf) → matching demo file:
 *   Martine — admin PME              → small_business.db   (customers, orders, invoices)
 *   Youssef — boutique e-commerce    → ecommerce_shop.db   (products, orders, order_items)
 *   Claire  — présidente association → association.db      (members, payments, events)
 *
 * Extras to widen the coverage:
 *   library.db, garage.db, medical_clinic.db
 *
 * Stress tests for the humanizer (cryptic naming):
 *   weird_v1.db, weird_v2.db
 *
 * Each database deliberately mixes prefixed / numbered / snake_case table
 * names and abbreviated column names so the heuristic humanizer (and the
 * optional LLM pass) are showcased.
 *
 * Usage:
 *   npm run demo:db
 */

import Database from 'better-sqlite3';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'demo-databases');
mkdirSync(OUT_DIR, { recursive: true });

createSmallBusiness(join(OUT_DIR, 'small_business.db'));
createEcommerceShop(join(OUT_DIR, 'ecommerce_shop.db'));
createAssociation(join(OUT_DIR, 'association.db'));
createLibrary(join(OUT_DIR, 'library.db'));
createGarage(join(OUT_DIR, 'garage.db'));
createMedicalClinic(join(OUT_DIR, 'medical_clinic.db'));
createWeirdV1(join(OUT_DIR, 'weird_v1.db'));
createWeirdV2(join(OUT_DIR, 'weird_v2.db'));

console.log(`✅ Bases de démo régénérées dans ${OUT_DIR}`);

// ---------------------------------------------------------------------------
// Database 1 — Small business
// ---------------------------------------------------------------------------

function createSmallBusiness(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT,
      city TEXT,
      created_at TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      order_date TEXT,
      total_amount REAL,
      status TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      invoice_number TEXT,
      amount REAL,
      due_date TEXT,
      paid INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `);

  const customers: Array<[string, string, string, string]> = [
    ['Marie Dupont', 'marie.dupont@example.com', 'Lyon', '2024-01-15'],
    ['Jean Martin', 'jean.martin@example.com', 'Paris', '2024-02-03'],
    ['Sophie Bernard', 'sophie.bernard@example.com', 'Bordeaux', '2024-03-12'],
    ['Pierre Lefèvre', 'pierre.lefevre@example.com', 'Lyon', '2024-03-20'],
    ['Camille Roux', 'camille.roux@example.com', 'Marseille', '2024-04-01'],
    ['Lucas Moreau', 'lucas.moreau@example.com', 'Nantes', '2024-04-09'],
    ['Emma Garcia', 'emma.garcia@example.com', 'Toulouse', '2024-05-14'],
    ['Hugo Petit', 'hugo.petit@example.com', 'Lyon', '2024-05-22'],
    ['Léa Robert', 'lea.robert@example.com', 'Lille', '2024-06-03'],
    ['Nathan Richard', 'nathan.richard@example.com', 'Paris', '2024-06-18'],
    ['Chloé Durand', 'chloe.durand@example.com', 'Strasbourg', '2024-07-05'],
    ['Théo Lambert', 'theo.lambert@example.com', 'Lyon', '2024-07-29'],
    ['Manon Fontaine', 'manon.fontaine@example.com', 'Rennes', '2024-08-12'],
    ['Adam Mercier', 'adam.mercier@example.com', 'Nice', '2024-09-04'],
    ['Inès Faure', 'ines.faure@example.com', 'Paris', '2024-10-01'],
  ];
  const insertCustomer = db.prepare(
    'INSERT INTO customers (full_name, email, city, created_at) VALUES (?,?,?,?)',
  );
  for (const row of customers) insertCustomer.run(...row);

  const orders: Array<[number, string, number, string]> = [
    [1, '2026-03-03', 142.5, 'Payée'],
    [2, '2026-03-04', 89.0, 'Payée'],
    [3, '2026-03-05', 230.75, 'En attente'],
    [4, '2026-03-08', 56.0, 'Payée'],
    [5, '2026-03-12', 410.0, 'Payée'],
    [6, '2026-03-14', 18.9, 'Annulée'],
    [7, '2026-03-16', 79.0, 'Payée'],
    [8, '2026-03-18', 312.4, 'Payée'],
    [9, '2026-03-21', 64.5, 'En attente'],
    [10, '2026-03-23', 175.0, 'Payée'],
    [11, '2026-03-25', 42.0, 'Payée'],
    [12, '2026-03-28', 88.0, 'Payée'],
    [1, '2026-04-02', 55.0, 'Payée'],
    [5, '2026-04-09', 220.0, 'Payée'],
  ];
  const insertOrder = db.prepare(
    'INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES (?,?,?,?)',
  );
  for (const row of orders) insertOrder.run(...row);

  const invoices: Array<[number, string, number, string, number]> = [
    [1, 'FAC-2026-001', 142.5, '2026-04-04', 1],
    [2, 'FAC-2026-002', 89.0, '2026-04-05', 1],
    [3, 'FAC-2026-003', 230.75, '2026-04-06', 0],
    [4, 'FAC-2026-004', 56.0, '2026-04-09', 1],
    [5, 'FAC-2026-005', 410.0, '2026-04-13', 1],
    [7, 'FAC-2026-006', 79.0, '2026-04-17', 1],
    [8, 'FAC-2026-007', 312.4, '2026-04-19', 1],
    [9, 'FAC-2026-008', 64.5, '2026-04-22', 0],
    [10, 'FAC-2026-009', 175.0, '2026-04-24', 1],
    [11, 'FAC-2026-010', 42.0, '2026-04-26', 1],
    [12, 'FAC-2026-011', 88.0, '2026-04-29', 1],
    [1, 'FAC-2026-012', 55.0, '2026-05-03', 1],
  ];
  const insertInvoice = db.prepare(
    'INSERT INTO invoices (customer_id, invoice_number, amount, due_date, paid) VALUES (?,?,?,?,?)',
  );
  for (const row of invoices) insertInvoice.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 2 — E-commerce shop (Youssef, 38, gère une boutique en ligne)
//   Shopify-style: clean column names, focus on stocks / orders / month sales.
// ---------------------------------------------------------------------------

function createEcommerceShop(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      sku TEXT UNIQUE,
      title TEXT NOT NULL,
      category TEXT,
      price_eur REAL,
      stock_qty INTEGER,
      low_stock_alert INTEGER
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      order_ref TEXT UNIQUE,
      customer_name TEXT,
      customer_email TEXT,
      shipping_city TEXT,
      order_date TEXT,
      total_eur REAL,
      status TEXT
    );
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER,
      unit_price_eur REAL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  const products: Array<[string, string, string, number, number, number]> = [
    ['SKU-001', 'T-shirt coton bio — Blanc', 'Vêtements', 24.9, 38, 10],
    ['SKU-002', 'T-shirt coton bio — Noir', 'Vêtements', 24.9, 4, 10],
    ['SKU-003', 'Sweat à capuche — Gris', 'Vêtements', 49.0, 22, 8],
    ['SKU-004', 'Casquette brodée', 'Accessoires', 18.5, 0, 5],
    ['SKU-005', 'Tote bag jute', 'Accessoires', 9.9, 65, 15],
    ['SKU-006', 'Mug en céramique', 'Maison', 12.0, 12, 10],
    ['SKU-007', 'Bouteille inox 500 ml', 'Maison', 22.0, 7, 10],
    ['SKU-008', 'Sticker pack (10 unités)', 'Papeterie', 6.5, 120, 20],
    ['SKU-009', 'Carnet A5 lignes', 'Papeterie', 14.0, 33, 10],
    ['SKU-010', 'Stylo gel premium', 'Papeterie', 4.9, 90, 25],
    ['SKU-011', 'Coffret cadeau découverte', 'Coffrets', 49.9, 5, 5],
    ['SKU-012', 'Coffret cadeau premium', 'Coffrets', 89.0, 2, 3],
    ['SKU-013', 'Affiche A2 illustration', 'Décoration', 19.0, 18, 8],
    ['SKU-014', 'Pin émaillé collector', 'Accessoires', 7.5, 1, 5],
    ['SKU-015', 'Bonnet en laine', 'Vêtements', 29.0, 14, 8],
  ];
  const insertProduct = db.prepare(
    'INSERT INTO products (sku, title, category, price_eur, stock_qty, low_stock_alert) VALUES (?,?,?,?,?,?)',
  );
  for (const row of products) insertProduct.run(...row);

  const orders: Array<[string, string, string, string, string, number, string]> = [
    ['SHOP-2026-0001', 'Léa Bonnet', 'lea.bonnet@example.com', 'Lyon', '2026-04-02', 49.8, 'Expédiée'],
    ['SHOP-2026-0002', 'Karim Saïdi', 'karim.saidi@example.com', 'Paris', '2026-04-04', 73.4, 'Expédiée'],
    ['SHOP-2026-0003', 'Inès Charrier', 'ines.charrier@example.com', 'Bordeaux', '2026-04-07', 18.5, 'Annulée'],
    ['SHOP-2026-0004', 'Hugo Mansouri', 'hugo.mansouri@example.com', 'Lyon', '2026-04-09', 89.0, 'Expédiée'],
    ['SHOP-2026-0005', 'Emma Lefranc', 'emma.lefranc@example.com', 'Toulouse', '2026-04-11', 41.4, 'Expédiée'],
    ['SHOP-2026-0006', 'Noah Benhamou', 'noah.benhamou@example.com', 'Marseille', '2026-04-12', 12.0, 'Préparation'],
    ['SHOP-2026-0007', 'Mila Aubry', 'mila.aubry@example.com', 'Lille', '2026-04-15', 64.4, 'Expédiée'],
    ['SHOP-2026-0008', 'Léon Petit', 'leon.petit@example.com', 'Lyon', '2026-04-17', 119.9, 'Expédiée'],
    ['SHOP-2026-0009', 'Anaïs Garcia', 'anais.garcia@example.com', 'Nantes', '2026-04-19', 27.4, 'Préparation'],
    ['SHOP-2026-0010', 'Tom Faure', 'tom.faure@example.com', 'Strasbourg', '2026-04-21', 49.9, 'Expédiée'],
    ['SHOP-2026-0011', 'Sara Lambert', 'sara.lambert@example.com', 'Paris', '2026-04-23', 56.4, 'Expédiée'],
    ['SHOP-2026-0012', 'Yanis Robert', 'yanis.robert@example.com', 'Lyon', '2026-04-25', 9.9, 'Préparation'],
    ['SHOP-2026-0013', 'Camille Joly', 'camille.joly@example.com', 'Bron', '2026-04-26', 42.4, 'Expédiée'],
    ['SHOP-2026-0014', 'Elias Marchand', 'elias.marchand@example.com', 'Vénissieux', '2026-04-28', 89.0, 'Préparation'],
    ['SHOP-2026-0015', 'Romane Henry', 'romane.henry@example.com', 'Lyon', '2026-04-30', 31.4, 'Expédiée'],
  ];
  const insertOrder = db.prepare(
    'INSERT INTO orders (order_ref, customer_name, customer_email, shipping_city, order_date, total_eur, status) VALUES (?,?,?,?,?,?,?)',
  );
  for (const row of orders) insertOrder.run(...row);

  const items: Array<[number, number, number, number]> = [
    [1, 1, 2, 24.9],
    [2, 3, 1, 49.0],
    [2, 5, 1, 9.9],
    [2, 9, 1, 14.0],
    [3, 4, 1, 18.5],
    [4, 12, 1, 89.0],
    [5, 1, 1, 24.9],
    [5, 9, 1, 14.0],
    [5, 8, 1, 6.5],
    [6, 6, 1, 12.0],
    [7, 3, 1, 49.0],
    [7, 9, 1, 14.0],
    [7, 5, 1, 9.9],
    [8, 11, 1, 49.9],
    [8, 7, 1, 22.0],
    [8, 1, 2, 24.9],
    [9, 13, 1, 19.0],
    [9, 10, 1, 4.9],
    [9, 8, 1, 6.5],
    [10, 11, 1, 49.9],
    [11, 15, 1, 29.0],
    [11, 7, 1, 22.0],
    [11, 9, 1, 14.0],
    [12, 5, 1, 9.9],
    [13, 13, 1, 19.0],
    [13, 1, 1, 24.9],
    [14, 12, 1, 89.0],
    [15, 9, 1, 14.0],
    [15, 1, 1, 24.9],
  ];
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, qty, unit_price_eur) VALUES (?,?,?,?)',
  );
  for (const row of items) insertItem.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 3 — Nonprofit association
// ---------------------------------------------------------------------------

function createAssociation(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE members (
      id INTEGER PRIMARY KEY,
      full_name TEXT,
      email TEXT,
      city TEXT,
      joined_at TEXT,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      member_id INTEGER NOT NULL,
      payment_date TEXT,
      amount REAL,
      year INTEGER NOT NULL,
      paid INTEGER,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE events (
      id INTEGER PRIMARY KEY,
      title TEXT,
      event_date TEXT,
      location TEXT,
      attendees_count INTEGER
    );
  `);

  const members: Array<[string, string, string, string, number]> = [
    ['Anne Lemoine', 'anne.lemoine@asso.fr', 'Lyon', '2019-04-12', 1],
    ['Bernard Caron', 'bernard.caron@asso.fr', 'Paris', '2019-09-23', 1],
    ['Cécile Renard', 'cecile.renard@asso.fr', 'Lyon', '2020-02-05', 1],
    ['Daniel Olivier', 'daniel.olivier@asso.fr', 'Lille', '2020-06-18', 1],
    ['Élodie Schmitt', 'elodie.schmitt@asso.fr', 'Bordeaux', '2021-01-10', 1],
    ['François Henry', 'francois.henry@asso.fr', 'Toulouse', '2021-05-22', 0],
    ['Geneviève Marchand', 'g.marchand@asso.fr', 'Lyon', '2022-03-04', 1],
    ['Henri Joly', 'henri.joly@asso.fr', 'Nantes', '2022-08-15', 1],
    ['Isabelle Perrot', 'isabelle.perrot@asso.fr', 'Paris', '2023-01-20', 1],
    ['Julien Brun', 'julien.brun@asso.fr', 'Strasbourg', '2023-07-09', 1],
    ['Karine Lopez', 'karine.lopez@asso.fr', 'Marseille', '2024-02-14', 1],
    ['Louis Vasseur', 'louis.vasseur@asso.fr', 'Lyon', '2024-09-30', 1],
  ];
  const insertMember = db.prepare(
    'INSERT INTO members (full_name, email, city, joined_at, active) VALUES (?,?,?,?,?)',
  );
  for (const row of members) insertMember.run(...row);

  const payments: Array<[number, string | null, number, number, number]> = [
    [1, '2025-01-12', 30, 2025, 1],
    [2, '2025-01-20', 30, 2025, 1],
    [3, '2025-02-03', 30, 2025, 1],
    [4, '2025-02-15', 30, 2025, 1],
    [5, '2025-03-01', 30, 2025, 1],
    [6, '2025-03-10', 30, 2025, 1],
    [7, '2025-03-22', 30, 2025, 1],
    [8, '2025-04-01', 30, 2025, 1],
    [9, '2025-04-12', 30, 2025, 1],
    [10, '2025-05-05', 30, 2025, 1],
    [11, '2025-05-18', 30, 2025, 1],
    [1, '2026-01-15', 30, 2026, 1],
    [2, '2026-01-22', 30, 2026, 1],
    [3, '2026-02-04', 30, 2026, 1],
    [4, null, 0, 2026, 0],
    [5, '2026-02-19', 30, 2026, 1],
    [6, null, 0, 2026, 0],
    [7, null, 0, 2026, 0],
    [8, '2026-03-02', 30, 2026, 1],
    [9, null, 0, 2026, 0],
    [10, '2026-03-15', 30, 2026, 1],
    [11, null, 0, 2026, 0],
    [12, '2026-04-01', 30, 2026, 1],
  ];
  const insertPayment = db.prepare(
    'INSERT INTO payments (member_id, payment_date, amount, year, paid) VALUES (?,?,?,?,?)',
  );
  for (const row of payments) insertPayment.run(...row);

  const events: Array<[string, string, string, number]> = [
    ['Assemblée générale 2025', '2025-03-15', 'Lyon', 32],
    ['Atelier débutants', '2025-05-10', 'Lyon', 18],
    ['Pique-nique de l’association', '2025-07-06', 'Parc de la Tête d’Or', 41],
    ['Conférence annuelle', '2025-10-21', 'Paris', 56],
    ['Galette des rois', '2026-01-12', 'Lyon', 24],
    ['Atelier intermédiaire', '2026-02-09', 'Lyon', 22],
    ['Sortie nature', '2026-04-19', 'Forêt de Brotonne', 19],
    ['Assemblée générale 2026', '2026-05-17', 'Lyon', 0],
  ];
  const insertEvent = db.prepare(
    'INSERT INTO events (title, event_date, location, attendees_count) VALUES (?,?,?,?)',
  );
  for (const row of events) insertEvent.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 3 — Public library
//   Schema deliberately ugly: prefixes (tbl_, bk_, usr_), year suffix.
// ---------------------------------------------------------------------------

function createLibrary(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE tbl_books (
      id INTEGER PRIMARY KEY,
      isbn TEXT,
      title TEXT NOT NULL,
      author TEXT,
      pub_year INTEGER,
      qty_total INTEGER,
      qty_avail INTEGER
    );
    CREATE TABLE bk_loans_2024 (
      id INTEGER PRIMARY KEY,
      bk_id INTEGER NOT NULL,
      usr_id INTEGER NOT NULL,
      loan_date TEXT,
      due_date TEXT,
      returned INTEGER,
      FOREIGN KEY (bk_id) REFERENCES tbl_books(id)
    );
    CREATE TABLE usr_members (
      id INTEGER PRIMARY KEY,
      full_name TEXT,
      email TEXT,
      addr_city TEXT,
      joined_on TEXT,
      active INTEGER
    );
  `);

  const books: Array<[string, string, string, number, number, number]> = [
    ['978-2-07-040850-4', "L'Étranger", 'Albert Camus', 1942, 4, 2],
    ['978-2-07-036822-8', 'Le Petit Prince', 'Antoine de Saint-Exupéry', 1943, 6, 4],
    ['978-2-253-00422-5', 'Madame Bovary', 'Gustave Flaubert', 1857, 3, 1],
    ['978-2-07-061064-8', 'Les Misérables', 'Victor Hugo', 1862, 2, 0],
    ['978-2-07-040320-2', 'Voyage au bout de la nuit', 'Louis-Ferdinand Céline', 1932, 2, 2],
    ['978-2-07-036473-2', 'La Peste', 'Albert Camus', 1947, 3, 2],
    ['978-2-253-00583-3', 'À la recherche du temps perdu', 'Marcel Proust', 1913, 1, 0],
    ['978-2-070-37008-3', 'Bonjour tristesse', 'Françoise Sagan', 1954, 4, 3],
    ['978-2-07-036002-3', 'Le Rouge et le Noir', 'Stendhal', 1830, 3, 2],
    ['978-2-253-09635-0', 'Cyrano de Bergerac', 'Edmond Rostand', 1897, 2, 1],
    ['978-2-070-36001-7', 'Germinal', 'Émile Zola', 1885, 3, 3],
    ['978-2-070-41131-5', "L'Élégance du hérisson", 'Muriel Barbery', 2006, 5, 4],
    ['978-2-080-71121-0', 'Les Fleurs du mal', 'Charles Baudelaire', 1857, 2, 2],
    ['978-2-070-77758-0', 'Le Comte de Monte-Cristo', 'Alexandre Dumas', 1844, 2, 1],
  ];
  const insertBook = db.prepare(
    'INSERT INTO tbl_books (isbn, title, author, pub_year, qty_total, qty_avail) VALUES (?,?,?,?,?,?)',
  );
  for (const row of books) insertBook.run(...row);

  const members: Array<[string, string, string, string, number]> = [
    ['Aurélie Blanchet', 'a.blanchet@bm.fr', 'Lyon', '2022-01-10', 1],
    ['Benoît Charpentier', 'b.charpentier@bm.fr', 'Villeurbanne', '2022-04-22', 1],
    ['Clémence Da Silva', 'c.dasilva@bm.fr', 'Lyon', '2023-02-15', 1],
    ['David Klein', 'd.klein@bm.fr', 'Caluire', '2023-06-03', 1],
    ['Élise Maréchal', 'e.marechal@bm.fr', 'Lyon', '2023-09-19', 1],
    ['Farid Boukhari', 'f.boukhari@bm.fr', 'Lyon', '2024-01-04', 1],
    ['Gaëlle Picard', 'g.picard@bm.fr', 'Bron', '2024-05-21', 1],
    ['Hervé Roussel', 'h.roussel@bm.fr', 'Lyon', '2024-08-09', 0],
    ['Iris Lefranc', 'i.lefranc@bm.fr', 'Lyon', '2025-02-27', 1],
    ['Jérémy Tisserand', 'j.tisserand@bm.fr', 'Vénissieux', '2025-09-13', 1],
  ];
  const insertMember = db.prepare(
    'INSERT INTO usr_members (full_name, email, addr_city, joined_on, active) VALUES (?,?,?,?,?)',
  );
  for (const row of members) insertMember.run(...row);

  const loans: Array<[number, number, string, string, number]> = [
    [1, 1, '2024-09-01', '2024-09-22', 1],
    [2, 2, '2024-09-04', '2024-09-25', 1],
    [3, 3, '2024-09-07', '2024-09-28', 1],
    [4, 4, '2024-10-12', '2024-11-02', 0],
    [1, 5, '2024-10-18', '2024-11-08', 1],
    [5, 6, '2024-11-02', '2024-11-23', 1],
    [6, 7, '2024-11-15', '2024-12-06', 1],
    [7, 8, '2024-11-29', '2024-12-20', 0],
    [8, 9, '2024-12-03', '2024-12-24', 1],
    [9, 10, '2024-12-19', '2025-01-09', 1],
    [10, 1, '2024-12-22', '2025-01-12', 1],
    [11, 2, '2024-12-28', '2025-01-18', 1],
    [12, 3, '2024-12-30', '2025-01-20', 0],
  ];
  const insertLoan = db.prepare(
    'INSERT INTO bk_loans_2024 (bk_id, usr_id, loan_date, due_date, returned) VALUES (?,?,?,?,?)',
  );
  for (const row of loans) insertLoan.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 4 — Independent garage
// ---------------------------------------------------------------------------

function createGarage(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE clients (
      id INTEGER PRIMARY KEY,
      full_name TEXT,
      tel TEXT,
      addr_city TEXT,
      created_at TEXT
    );
    CREATE TABLE vehicles (
      id INTEGER PRIMARY KEY,
      client_id INTEGER NOT NULL,
      plate_no TEXT,
      make TEXT,
      model TEXT,
      vin TEXT,
      mileage_km INTEGER,
      next_service_date TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
    CREATE TABLE t_repairs (
      id INTEGER PRIMARY KEY,
      vehicle_id INTEGER NOT NULL,
      repair_ref TEXT,
      repair_date TEXT,
      labor_hours REAL,
      cost_eur REAL,
      paid INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );
  `);

  const clients: Array<[string, string, string, string]> = [
    ['Mathieu Aubry', '06 12 34 56 78', 'Lyon', '2023-03-04'],
    ['Nicole Pasquier', '06 98 76 54 32', 'Caluire', '2023-04-19'],
    ['Olivier Marchal', '06 11 22 33 44', 'Lyon', '2023-08-02'],
    ['Patricia Vincent', '06 55 44 33 22', 'Bron', '2023-11-15'],
    ['Quentin Rouquier', '06 22 33 44 55', 'Lyon', '2024-01-23'],
    ['Romane Fillon', '06 77 88 99 00', 'Vénissieux', '2024-03-30'],
    ['Sébastien Gros', '06 44 55 66 77', 'Lyon', '2024-06-11'],
    ['Tania Berger', '06 33 22 11 00', 'Villeurbanne', '2024-09-08'],
    ['Ulysse Mahé', '06 99 88 77 66', 'Lyon', '2025-01-12'],
    ['Vanessa Rey', '06 66 55 44 33', 'Lyon', '2025-04-25'],
  ];
  const insertClient = db.prepare(
    'INSERT INTO clients (full_name, tel, addr_city, created_at) VALUES (?,?,?,?)',
  );
  for (const row of clients) insertClient.run(...row);

  const vehicles: Array<[number, string, string, string, string, number, string]> = [
    [1, 'AB-123-CD', 'Renault', 'Clio', 'VF1RJA00064123456', 89_000, '2026-09-04'],
    [2, 'EF-456-GH', 'Peugeot', '208', 'VF3CCRFJC65789012', 42_300, '2026-08-19'],
    [3, 'IJ-789-KL', 'Citroën', 'C3', 'VF7SC9HZCAW345678', 105_500, '2026-07-02'],
    [4, 'MN-012-OP', 'Volkswagen', 'Golf', 'WVWZZZ1KZ8W012345', 67_800, '2026-10-15'],
    [5, 'QR-345-ST', 'Toyota', 'Yaris', 'JTDKB20U497456789', 31_200, '2026-09-23'],
    [6, 'UV-678-WX', 'Renault', 'Mégane', 'VF1BM0F0H40678901', 124_700, '2026-08-30'],
    [7, 'YZ-901-AB', 'Dacia', 'Sandero', 'UU1DJF1E563901234', 58_400, '2026-11-11'],
    [8, 'CD-234-EF', 'BMW', 'Série 1', 'WBA1V510705234567', 73_900, '2026-09-08'],
    [9, 'GH-567-IJ', 'Mercedes', 'Classe A', 'WDD1760421J567890', 49_100, '2026-07-12'],
    [10, 'KL-890-MN', 'Audi', 'A3', 'WAUZZZ8V8GA890123', 88_600, '2026-10-25'],
    [1, 'OP-123-QR', 'Tesla', 'Model 3', '5YJ3E1EA1JF123456', 22_500, '2026-12-01'],
  ];
  const insertVehicle = db.prepare(
    'INSERT INTO vehicles (client_id, plate_no, make, model, vin, mileage_km, next_service_date) VALUES (?,?,?,?,?,?,?)',
  );
  for (const row of vehicles) insertVehicle.run(...row);

  const repairs: Array<[number, string, string, number, number, number]> = [
    [1, 'REP-2026-001', '2026-03-04', 1.5, 145.0, 1],
    [2, 'REP-2026-002', '2026-03-09', 2.0, 220.0, 1],
    [3, 'REP-2026-003', '2026-03-15', 4.5, 680.0, 0],
    [4, 'REP-2026-004', '2026-03-21', 0.8, 95.0, 1],
    [5, 'REP-2026-005', '2026-03-28', 3.2, 410.0, 1],
    [6, 'REP-2026-006', '2026-04-02', 6.0, 920.0, 0],
    [7, 'REP-2026-007', '2026-04-09', 1.0, 130.0, 1],
    [8, 'REP-2026-008', '2026-04-13', 2.5, 350.0, 1],
    [9, 'REP-2026-009', '2026-04-21', 5.0, 740.0, 0],
    [10, 'REP-2026-010', '2026-04-28', 1.2, 175.0, 1],
    [11, 'REP-2026-011', '2026-05-03', 0.5, 60.0, 1],
    [1, 'REP-2026-012', '2026-05-12', 2.8, 320.0, 1],
  ];
  const insertRepair = db.prepare(
    'INSERT INTO t_repairs (vehicle_id, repair_ref, repair_date, labor_hours, cost_eur, paid) VALUES (?,?,?,?,?,?)',
  );
  for (const row of repairs) insertRepair.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 5 — Medical clinic
//   Cryptic abbreviations on purpose (pat_, apt_, rx_, dob, dur_min, dosage_mg).
// ---------------------------------------------------------------------------

function createMedicalClinic(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE patients (
      id INTEGER PRIMARY KEY,
      pat_ref TEXT,
      full_name TEXT,
      dob TEXT,
      tel TEXT,
      addr_city TEXT,
      created_at TEXT
    );
    CREATE TABLE tbl_apt_2026 (
      id INTEGER PRIMARY KEY,
      pat_id INTEGER NOT NULL,
      apt_date TEXT,
      apt_dur_min INTEGER,
      reason TEXT,
      done INTEGER,
      FOREIGN KEY (pat_id) REFERENCES patients(id)
    );
    CREATE TABLE prescriptions (
      id INTEGER PRIMARY KEY,
      pat_id INTEGER NOT NULL,
      rx_ref TEXT,
      issued_on TEXT,
      med_name TEXT,
      dosage_mg INTEGER,
      duration_days INTEGER,
      FOREIGN KEY (pat_id) REFERENCES patients(id)
    );
  `);

  const patients: Array<[string, string, string, string, string, string]> = [
    ['PAT-1001', 'Alice Bonnet', '1985-04-12', '06 10 20 30 40', 'Lyon', '2023-01-09'],
    ['PAT-1002', 'Bruno Carpentier', '1972-09-05', '06 11 21 31 41', 'Caluire', '2023-02-14'],
    ['PAT-1003', 'Camille Diop', '1990-12-22', '06 12 22 32 42', 'Lyon', '2023-04-21'],
    ['PAT-1004', 'Damien Evrard', '1968-07-15', '06 13 23 33 43', 'Bron', '2023-06-08'],
    ['PAT-1005', 'Estelle Fournel', '2001-03-19', '06 14 24 34 44', 'Lyon', '2023-08-30'],
    ['PAT-1006', 'Fabien Goujon', '1979-11-02', '06 15 25 35 45', 'Vénissieux', '2023-11-17'],
    ['PAT-1007', 'Gisèle Halimi', '1955-05-28', '06 16 26 36 46', 'Lyon', '2024-01-04'],
    ['PAT-1008', 'Hakim Idrissi', '1988-08-09', '06 17 27 37 47', 'Lyon', '2024-03-22'],
    ['PAT-1009', 'Iliana Jansen', '1995-01-31', '06 18 28 38 48', 'Villeurbanne', '2024-06-15'],
    ['PAT-1010', 'Jérôme Klein', '1962-10-14', '06 19 29 39 49', 'Lyon', '2024-09-02'],
    ['PAT-1011', 'Karine Lefèvre', '1983-02-26', '06 20 30 40 50', 'Lyon', '2024-12-11'],
    ['PAT-1012', 'Loïc Maréchal', '1970-06-07', '06 21 31 41 51', 'Caluire', '2025-03-08'],
  ];
  const insertPatient = db.prepare(
    'INSERT INTO patients (pat_ref, full_name, dob, tel, addr_city, created_at) VALUES (?,?,?,?,?,?)',
  );
  for (const row of patients) insertPatient.run(...row);

  const appointments: Array<[number, string, number, string, number]> = [
    [1, '2026-03-02 09:00', 30, 'Consultation annuelle', 1],
    [2, '2026-03-02 10:00', 20, 'Renouvellement ordonnance', 1],
    [3, '2026-03-03 11:30', 45, 'Bilan sanguin', 1],
    [4, '2026-03-04 14:00', 30, 'Suivi tension', 0],
    [5, '2026-03-05 08:30', 30, 'Vaccination', 1],
    [6, '2026-03-06 16:00', 60, 'Examen complémentaire', 1],
    [7, '2026-03-09 09:30', 20, 'Consultation', 1],
    [8, '2026-03-10 11:00', 30, 'Suivi diabétique', 0],
    [9, '2026-03-11 14:30', 45, 'Première visite', 1],
    [10, '2026-03-12 10:30', 30, 'Renouvellement ordonnance', 1],
    [11, '2026-03-13 15:00', 60, 'Examen ORL', 1],
    [12, '2026-03-16 09:00', 30, 'Suivi', 1],
  ];
  const insertApt = db.prepare(
    'INSERT INTO tbl_apt_2026 (pat_id, apt_date, apt_dur_min, reason, done) VALUES (?,?,?,?,?)',
  );
  for (const row of appointments) insertApt.run(...row);

  const prescriptions: Array<[number, string, string, string, number, number]> = [
    [1, 'RX-2026-001', '2026-03-02', 'Paracétamol', 1000, 7],
    [2, 'RX-2026-002', '2026-03-02', 'Atorvastatine', 20, 90],
    [3, 'RX-2026-003', '2026-03-03', 'Amoxicilline', 500, 8],
    [5, 'RX-2026-004', '2026-03-05', 'Ibuprofène', 400, 5],
    [6, 'RX-2026-005', '2026-03-06', 'Lévothyroxine', 50, 90],
    [7, 'RX-2026-006', '2026-03-09', 'Doliprane', 1000, 6],
    [9, 'RX-2026-007', '2026-03-11', 'Spasfon', 80, 10],
    [10, 'RX-2026-008', '2026-03-12', 'Ramipril', 5, 90],
    [11, 'RX-2026-009', '2026-03-13', 'Cétirizine', 10, 30],
    [12, 'RX-2026-010', '2026-03-16', 'Metformine', 1000, 90],
  ];
  const insertRx = db.prepare(
    'INSERT INTO prescriptions (pat_id, rx_ref, issued_on, med_name, dosage_mg, duration_days) VALUES (?,?,?,?,?,?)',
  );
  for (const row of prescriptions) insertRx.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 6 — Weird v1 (extreme abbreviations, exact schema requested)
//   Goal: stress-test the heuristic humanizer.
// ---------------------------------------------------------------------------

function createWeirdV1(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE tbl_usr_x9 (
      u_id INTEGER PRIMARY KEY,
      nm_full TEXT,
      eml_addr TEXT,
      loc_cty TEXT,
      crt_ts TEXT
    );
    CREATE TABLE tbl_ord_2019 (
      ord_id INTEGER PRIMARY KEY,
      usr_ref INTEGER NOT NULL,
      dt_ord TEXT,
      amt_tot REAL,
      st_flag TEXT
    );
    CREATE TABLE x_payment_log (
      p_id INTEGER PRIMARY KEY,
      usr_link INTEGER NOT NULL,
      p_dt TEXT,
      p_amt REAL,
      is_pd INTEGER
    );
  `);

  const users: Array<[string, string, string, string]> = [
    ['Alex Walters', 'alex.walters@x9.io', 'Lyon', '2019-02-14T10:11:00'],
    ['Bea Ortega', 'bea.ortega@x9.io', 'Paris', '2019-04-02T09:23:00'],
    ['Cyril Nguyen', 'cyril.nguyen@x9.io', 'Toulouse', '2019-05-18T15:42:00'],
    ['Dahlia Park', 'dahlia.park@x9.io', 'Bordeaux', '2019-07-21T08:05:00'],
    ['Émile Vidal', 'emile.vidal@x9.io', 'Lyon', '2019-08-30T14:50:00'],
    ['Florence Aubin', 'florence.aubin@x9.io', 'Lille', '2019-10-12T11:00:00'],
    ['Gabriel Solé', 'gabriel.sole@x9.io', 'Lyon', '2019-11-04T16:30:00'],
    ['Hana Lévi', 'hana.levi@x9.io', 'Marseille', '2019-12-19T13:15:00'],
    ['Idris Bouchard', 'idris.bouchard@x9.io', 'Nantes', '2020-02-08T10:45:00'],
    ['Jade Forster', 'jade.forster@x9.io', 'Strasbourg', '2020-03-22T12:33:00'],
    ['Kai Mendès', 'kai.mendes@x9.io', 'Lyon', '2020-05-09T09:00:00'],
    ['Liana Rocher', 'liana.rocher@x9.io', 'Paris', '2020-06-17T17:00:00'],
  ];
  const insertUser = db.prepare(
    'INSERT INTO tbl_usr_x9 (nm_full, eml_addr, loc_cty, crt_ts) VALUES (?,?,?,?)',
  );
  for (const row of users) insertUser.run(...row);

  const orders: Array<[number, string, number, string]> = [
    [1, '2019-03-04', 142.5, 'OK'],
    [2, '2019-05-09', 89.0, 'OK'],
    [3, '2019-06-21', 230.75, 'PEND'],
    [4, '2019-08-12', 56.0, 'OK'],
    [5, '2019-09-18', 410.0, 'OK'],
    [6, '2019-11-02', 18.9, 'CANC'],
    [7, '2019-12-15', 79.0, 'OK'],
    [8, '2020-01-09', 312.4, 'OK'],
    [9, '2020-02-21', 64.5, 'PEND'],
    [10, '2020-03-30', 175.0, 'OK'],
    [11, '2020-04-14', 42.0, 'OK'],
    [12, '2020-05-25', 88.0, 'OK'],
    [1, '2020-06-04', 55.0, 'OK'],
    [5, '2020-07-12', 220.0, 'OK'],
  ];
  const insertOrder = db.prepare(
    'INSERT INTO tbl_ord_2019 (usr_ref, dt_ord, amt_tot, st_flag) VALUES (?,?,?,?)',
  );
  for (const row of orders) insertOrder.run(...row);

  const payments: Array<[number, string | null, number, number]> = [
    [1, '2019-03-08', 142.5, 1],
    [2, '2019-05-12', 89.0, 1],
    [3, null, 0, 0],
    [4, '2019-08-18', 56.0, 1],
    [5, '2019-09-22', 410.0, 1],
    [7, '2019-12-19', 79.0, 1],
    [8, '2020-01-15', 312.4, 1],
    [9, null, 0, 0],
    [10, '2020-04-02', 175.0, 1],
    [11, '2020-04-19', 42.0, 1],
    [12, '2020-05-30', 88.0, 1],
    [1, '2020-06-09', 55.0, 1],
  ];
  const insertPayment = db.prepare(
    'INSERT INTO x_payment_log (usr_link, p_dt, p_amt, is_pd) VALUES (?,?,?,?)',
  );
  for (const row of payments) insertPayment.run(...row);

  db.close();
}

// ---------------------------------------------------------------------------
// Database 7 — Weird v2 (HR / payroll, equally cryptic)
// ---------------------------------------------------------------------------

function createWeirdV2(filePath: string): void {
  rmSync(filePath, { force: true });
  const db = new Database(filePath);

  db.exec(`
    CREATE TABLE hr_emp_v2 (
      e_id INTEGER PRIMARY KEY,
      nm_fst TEXT,
      nm_lst TEXT,
      dpt_cd TEXT,
      hrd_dt TEXT,
      slr_mo REAL,
      mgr_ref INTEGER,
      st TEXT
    );
    CREATE TABLE hr_lv_log (
      l_id INTEGER PRIMARY KEY,
      e_ref INTEGER NOT NULL,
      lv_typ TEXT,
      dt_st TEXT,
      dt_en TEXT,
      dys INTEGER,
      sts TEXT
    );
    CREATE TABLE t_pay_run (
      pr_id INTEGER PRIMARY KEY,
      e_ref INTEGER NOT NULL,
      pr_dt TEXT,
      gross_amt REAL,
      tx_amt REAL,
      net_amt REAL,
      st_flag TEXT
    );
  `);

  const employees: Array<[string, string, string, string, number, number | null, string]> = [
    ['Alice', 'Brun', 'ENG', '2018-09-03', 4200, null, 'ACT'],
    ['Bruno', 'Caron', 'ENG', '2019-04-15', 3900, 1, 'ACT'],
    ['Camille', 'Diop', 'SALES', '2020-01-20', 3500, null, 'ACT'],
    ['David', 'Évrard', 'SALES', '2020-06-08', 3200, 3, 'ACT'],
    ['Emma', 'Fournel', 'HR', '2021-03-01', 4100, null, 'ACT'],
    ['Farid', 'Ghali', 'ENG', '2021-09-13', 3800, 1, 'ACT'],
    ['Géraldine', 'Henry', 'OPS', '2022-02-14', 3600, null, 'ACT'],
    ['Hugo', 'Isaac', 'ENG', '2022-08-22', 4000, 1, 'ACT'],
    ['Ines', 'Joly', 'SALES', '2023-01-09', 3300, 3, 'ACT'],
    ['Julien', 'Klein', 'OPS', '2023-05-30', 3700, 7, 'ACT'],
    ['Karine', 'Lefèvre', 'HR', '2024-02-12', 3400, 5, 'INACT'],
    ['Louis', 'Marchal', 'ENG', '2024-09-04', 4500, 1, 'ACT'],
  ];
  const insertEmp = db.prepare(
    'INSERT INTO hr_emp_v2 (nm_fst, nm_lst, dpt_cd, hrd_dt, slr_mo, mgr_ref, st) VALUES (?,?,?,?,?,?,?)',
  );
  for (const row of employees) insertEmp.run(...row);

  const leaves: Array<[number, string, string, string, number, string]> = [
    [1, 'CP', '2026-01-05', '2026-01-09', 5, 'OK'],
    [2, 'RTT', '2026-01-12', '2026-01-12', 1, 'OK'],
    [3, 'CP', '2026-02-02', '2026-02-13', 10, 'OK'],
    [4, 'MAL', '2026-02-09', '2026-02-13', 5, 'OK'],
    [5, 'CP', '2026-03-02', '2026-03-06', 5, 'OK'],
    [6, 'RTT', '2026-03-23', '2026-03-23', 1, 'OK'],
    [7, 'CP', '2026-04-06', '2026-04-17', 10, 'PEND'],
    [8, 'CP', '2026-05-04', '2026-05-08', 5, 'OK'],
    [9, 'MAL', '2026-05-11', '2026-05-15', 5, 'OK'],
    [10, 'RTT', '2026-06-01', '2026-06-01', 1, 'OK'],
    [11, 'CP', '2026-07-13', '2026-07-31', 14, 'PEND'],
    [12, 'CP', '2026-08-03', '2026-08-21', 14, 'OK'],
  ];
  const insertLv = db.prepare(
    'INSERT INTO hr_lv_log (e_ref, lv_typ, dt_st, dt_en, dys, sts) VALUES (?,?,?,?,?,?)',
  );
  for (const row of leaves) insertLv.run(...row);

  const payRuns: Array<[number, string, number, number, number, string]> = [
    [1, '2026-01-31', 4200, 1050, 3150, 'OK'],
    [2, '2026-01-31', 3900, 975, 2925, 'OK'],
    [3, '2026-01-31', 3500, 875, 2625, 'OK'],
    [4, '2026-01-31', 3200, 800, 2400, 'OK'],
    [5, '2026-01-31', 4100, 1025, 3075, 'OK'],
    [6, '2026-01-31', 3800, 950, 2850, 'OK'],
    [7, '2026-01-31', 3600, 900, 2700, 'OK'],
    [8, '2026-01-31', 4000, 1000, 3000, 'OK'],
    [9, '2026-01-31', 3300, 825, 2475, 'OK'],
    [10, '2026-01-31', 3700, 925, 2775, 'OK'],
    [12, '2026-01-31', 4500, 1125, 3375, 'OK'],
    [1, '2026-02-28', 4200, 1050, 3150, 'OK'],
    [2, '2026-02-28', 3900, 975, 2925, 'OK'],
    [3, '2026-02-28', 3500, 875, 2625, 'PEND'],
    [4, '2026-02-28', 3200, 800, 2400, 'OK'],
  ];
  const insertPr = db.prepare(
    'INSERT INTO t_pay_run (e_ref, pr_dt, gross_amt, tx_amt, net_amt, st_flag) VALUES (?,?,?,?,?,?)',
  );
  for (const row of payRuns) insertPr.run(...row);

  db.close();
}

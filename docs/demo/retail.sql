-- Synthetic retail records for product demonstrations. No customer data.
PRAGMA foreign_keys = ON;
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0)
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  ordered_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed','pending','cancelled'))
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  amount REAL NOT NULL CHECK (amount >= 0),
  paid_at TEXT NOT NULL
);
INSERT INTO customers VALUES
 (1,'Cedar Studio','London'),(2,'Northstar Books','Bristol'),
 (3,'Mosaic Labs','Manchester'),(4,'Harbor Design','Leeds'),
 (5,'Willow Workshop','York'),(6,'Juniper Office','Bath');
INSERT INTO products VALUES
 (1,'Desk lamp','Lighting',45),(2,'Notebook set','Stationery',18),
 (3,'Oak monitor stand','Workspace',65),(4,'Ceramic mug','Accessories',16),
 (5,'Desk organiser','Workspace',28),(6,'Reading light','Lighting',35),
 (7,'Pen collection','Stationery',12),(8,'Felt desk mat','Accessories',32);
INSERT INTO orders VALUES
 (1001,1,'2026-09-02','completed'),(1002,2,'2026-09-03','completed'),
 (1003,3,'2026-09-05','completed'),(1004,4,'2026-09-08','completed'),
 (1005,1,'2026-09-12','completed'),(1006,5,'2026-09-14','completed'),
 (1007,2,'2026-09-17','completed'),(1008,6,'2026-09-20','completed'),
 (1009,3,'2026-09-24','pending'),(1010,4,'2026-09-25','cancelled'),
 (1011,5,'2026-09-27','completed'),(1012,6,'2026-09-29','pending');
INSERT INTO order_items VALUES
 (1001,1,2,45),(1001,2,3,18),(1002,3,2,65),(1002,7,5,12),
 (1003,5,4,28),(1003,8,2,32),(1004,1,1,45),(1004,4,6,16),
 (1005,3,1,65),(1005,6,2,35),(1006,2,4,18),(1006,5,2,28),
 (1007,8,3,32),(1007,7,4,12),(1008,1,2,45),(1008,3,1,65),
 (1009,5,3,28),(1010,6,2,35),(1011,4,5,16),(1011,6,1,35),
 (1012,2,2,18),(1012,8,1,32);
INSERT INTO payments VALUES
 (1,1001,144,'2026-09-02'),(2,1002,190,'2026-09-03'),
 (3,1003,176,'2026-09-05'),(4,1004,141,'2026-09-08'),
 (5,1005,135,'2026-09-12'),(6,1006,128,'2026-09-14'),
 (7,1007,144,'2026-09-17'),(8,1008,155,'2026-09-20'),
 (9,1011,115,'2026-09-27');

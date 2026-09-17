/*
# StockPilot Phase 2 — Seed Data

## Overview
Seeds NovaTech Distribution with:
- 10 categories (hierarchical, some with parents)
- 50 realistic products (electronics, networking, accessories, storage)
- 3 warehouses (Main DC, East Coast, West Coast)
- Inventory records for all product/warehouse combinations with varied stock levels

All seed data uses the NovaTech Distribution org ID.
*/

-- Demo org ID
DO $$
DECLARE
  org_id uuid := '42b98cdb-934c-49c3-b0ba-0ccce498b9ad';
  cat_ids uuid[];
  wh_ids uuid[];
  prod_ids uuid[];
  i integer;
  qty integer;
BEGIN
  -- ============================================================
  -- CATEGORIES (10)
  -- ============================================================
  INSERT INTO categories (organization_id, name, description, status) VALUES
    (org_id, 'Laptops', 'Laptop computers and accessories', 'ACTIVE'),
    (org_id, 'Desktops', 'Desktop computers and workstations', 'ACTIVE'),
    (org_id, 'Monitors', 'Computer monitors and displays', 'ACTIVE'),
    (org_id, 'Networking', 'Network equipment and infrastructure', 'ACTIVE'),
    (org_id, 'Storage', 'Storage devices and media', 'ACTIVE'),
    (org_id, 'Peripherals', 'Input devices and peripherals', 'ACTIVE'),
    (org_id, 'Accessories', 'Cables, adapters, and accessories', 'ACTIVE'),
    (org_id, 'Components', 'Internal computer components', 'ACTIVE'),
    (org_id, 'Software', 'Software licenses and subscriptions', 'ACTIVE'),
    (org_id, 'Mobile Devices', 'Phones, tablets, and mobile accessories', 'ACTIVE')
  ON CONFLICT DO NOTHING;

  -- Set parent categories for some
  UPDATE categories SET parent_category_id = (
    SELECT id FROM categories WHERE organization_id = org_id AND name = 'Laptops'
  ) WHERE organization_id = org_id AND name = 'Accessories';

  -- ============================================================
  -- WAREHOUSES (3)
  -- ============================================================
  INSERT INTO warehouses (organization_id, name, code, address, city, country, manager, phone, email, capacity, status) VALUES
    (org_id, 'Main Distribution Center', 'MAIN-DC', '100 Industrial Blvd', 'Chicago, IL', 'USA', 'Robert Chen', '+1-312-555-0100', 'maindc@novatech.com', 50000, 'ACTIVE'),
    (org_id, 'East Coast Facility', 'EAST-01', '200 Harbor Drive', 'Newark, NJ', 'USA', 'Sarah Mitchell', '+1-973-555-0200', 'east@novatech.com', 30000, 'ACTIVE'),
    (org_id, 'West Coast Facility', 'WEST-01', '300 Tech Parkway', 'Long Beach, CA', 'USA', 'David Park', '+1-562-555-0300', 'west@novatech.com', 35000, 'ACTIVE')
  ON CONFLICT DO NOTHING;

  -- Get warehouse IDs
  SELECT array_agg(id) INTO wh_ids FROM warehouses WHERE organization_id = org_id;

  -- ============================================================
  -- PRODUCTS (50)
  -- ============================================================
  INSERT INTO products (organization_id, sku, barcode, name, description, category_id, brand, unit, cost_price, selling_price, tax_rate, minimum_stock, reorder_point, reorder_quantity, maximum_stock, weight, dimensions, status) VALUES
    -- Laptops (8)
    (org_id, 'LAP-DL-5440', '8901234500011', 'Dell Latitude 5440', '14-inch business laptop with Intel Core i7', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'Dell', 'piece', 980.00, 1299.00, 8.0, 10, 15, 30, 200, 1.5, '32x22x2cm', 'ACTIVE'),
    (org_id, 'LAP-DL-5450', '8901234500012', 'Dell Latitude 5450', '15-inch business laptop with Intel Core i7', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'Dell', 'piece', 1050.00, 1399.00, 8.0, 10, 15, 30, 200, 1.7, '36x25x2cm', 'ACTIVE'),
    (org_id, 'LAP-HP-840G10', '8901234500013', 'HP EliteBook 840 G10', '14-inch premium business ultrabook', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'HP', 'piece', 1150.00, 1599.00, 8.0, 8, 12, 24, 150, 1.3, '32x22x1.5cm', 'ACTIVE'),
    (org_id, 'LAP-HP-PB440', '8901234500014', 'HP ProBook 440 G10', '14-inch professional laptop', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'HP', 'piece', 720.00, 999.00, 8.0, 12, 20, 40, 250, 1.5, '32x22x2cm', 'ACTIVE'),
    (org_id, 'LAP-LE-T14G3', '8901234500015', 'Lenovo ThinkPad T14 Gen 3', '14-inch durable business laptop', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'Lenovo', 'piece', 1100.00, 1499.00, 8.0, 10, 15, 30, 180, 1.4, '32x22x1.8cm', 'ACTIVE'),
    (org_id, 'LAP-LE-X1C', '8901234500016', 'Lenovo ThinkPad X1 Carbon Gen 11', '14-inch ultralight business laptop', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'Lenovo', 'piece', 1450.00, 1999.00, 8.0, 5, 10, 20, 100, 1.1, '31x21x1.5cm', 'ACTIVE'),
    (org_id, 'LAP-AP-MBP14', '8901234500017', 'Apple MacBook Pro 14 M3', '14-inch MacBook Pro with M3 chip', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'Apple', 'piece', 1600.00, 1999.00, 8.0, 5, 8, 16, 80, 1.6, '31x22x1.5cm', 'ACTIVE'),
    (org_id, 'LAP-AP-MAIR15', '8901234500018', 'Apple MacBook Air 15 M2', '15-inch ultraportable MacBook Air', (SELECT id FROM categories WHERE name='Laptops' AND organization_id=org_id), 'Apple', 'piece', 1050.00, 1299.00, 8.0, 8, 12, 24, 120, 1.5, '34x24x1.1cm', 'ACTIVE'),

    -- Desktops (5)
    (org_id, 'DSK-DL-OPT7020', '8901234500021', 'Dell OptiPlex 7020 SFF', 'Small form factor business desktop', (SELECT id FROM categories WHERE name='Desktops' AND organization_id=org_id), 'Dell', 'piece', 650.00, 899.00, 8.0, 8, 12, 24, 150, 5.5, '29x29x10cm', 'ACTIVE'),
    (org_id, 'DSK-HP-ELITE800', '8901234500022', 'HP EliteDesk 800 G9', 'Micro form factor desktop PC', (SELECT id FROM categories WHERE name='Desktops' AND organization_id=org_id), 'HP', 'piece', 700.00, 999.00, 8.0, 6, 10, 20, 100, 1.3, '18x18x5cm', 'ACTIVE'),
    (org_id, 'DSK-LE-M90Q', '8901234500023', 'Lenovo ThinkCentre M90q', 'Compact business desktop', (SELECT id FROM categories WHERE name='Desktops' AND organization_id=org_id), 'Lenovo', 'piece', 680.00, 949.00, 8.0, 6, 10, 20, 120, 4.5, '18x18x4cm', 'ACTIVE'),
    (org_id, 'DSK-AP-IMAC24', '8901234500024', 'Apple iMac 24-inch M3', 'All-in-one desktop with 4.5K display', (SELECT id FROM categories WHERE name='Desktops' AND organization_id=org_id), 'Apple', 'piece', 1300.00, 1799.00, 8.0, 3, 5, 10, 50, 4.5, '54x45x15cm', 'ACTIVE'),
    (org_id, 'DSK-DL-PREC3660', '8901234500025', 'Dell Precision 3660 Tower', 'Workstation tower for professionals', (SELECT id FROM categories WHERE name='Desktops' AND organization_id=org_id), 'Dell', 'piece', 1400.00, 1899.00, 8.0, 3, 5, 10, 60, 10.0, '36x17x41cm', 'ACTIVE'),

    -- Monitors (5)
    (org_id, 'MON-DE-U2723QE', '8901234500031', 'Dell UltraSharp U2723QE 27"', '27-inch 4K USB-C monitor', (SELECT id FROM categories WHERE name='Monitors' AND organization_id=org_id), 'Dell', 'piece', 480.00, 649.00, 8.0, 15, 25, 50, 300, 5.6, '61x41x18cm', 'ACTIVE'),
    (org_id, 'MON-LG-27UP850', '8901234500032', 'LG 27UP850-W 27"', '27-inch 4K UHD monitor', (SELECT id FROM categories WHERE name='Monitors' AND organization_id=org_id), 'LG', 'piece', 380.00, 499.00, 8.0, 15, 25, 50, 300, 5.4, '61x37x18cm', 'ACTIVE'),
    (org_id, 'MON-SA-S32A805', '8901234500033', 'Samsung S32A800 32"', '32-inch 4K UHD monitor', (SELECT id FROM categories WHERE name='Monitors' AND organization_id=org_id), 'Samsung', 'piece', 420.00, 599.00, 8.0, 10, 15, 30, 200, 7.2, '71x52x22cm', 'ACTIVE'),
    (org_id, 'MON-AS-VG259Q', '8901234500034', 'ASUS VG259Q 25"', '25-inch Full HD gaming monitor', (SELECT id FROM categories WHERE name='Monitors' AND organization_id=org_id), 'ASUS', 'piece', 220.00, 299.00, 8.0, 20, 30, 60, 400, 4.0, '56x37x20cm', 'ACTIVE'),
    (org_id, 'MON-BN-GV2778', '8901234500035', 'BenQ GW2790QT 27"', '27-inch QHD IPS monitor', (SELECT id FROM categories WHERE name='Monitors' AND organization_id=org_id), 'BenQ', 'piece', 250.00, 349.00, 8.0, 12, 20, 40, 250, 4.8, '61x41x18cm', 'ACTIVE'),

    -- Networking (6)
    (org_id, 'NET-TPL-AX55', '8901234500041', 'TP-Link Archer AX55', 'Wi-Fi 6 dual-band router', (SELECT id FROM categories WHERE name='Networking' AND organization_id=org_id), 'TP-Link', 'piece', 85.00, 129.00, 8.0, 25, 40, 80, 500, 0.5, '26x16x4cm', 'ACTIVE'),
    (org_id, 'NET-TPL-AX6000', '8901234500042', 'TP-Link Archer AX6000', 'Wi-Fi 6 tri-band gaming router', (SELECT id FROM categories WHERE name='Networking' AND organization_id=org_id), 'TP-Link', 'piece', 180.00, 249.00, 8.0, 15, 25, 50, 300, 0.8, '28x18x5cm', 'ACTIVE'),
    (org_id, 'NET-NS-R7000P', '8901234500043', 'Netgear Nighthawk R7000P', 'Wi-Fi 5 router with MU-MIMO', (SELECT id FROM categories WHERE name='Networking' AND organization_id=org_id), 'Netgear', 'piece', 120.00, 169.00, 8.0, 15, 25, 50, 300, 0.7, '28x18x5cm', 'ACTIVE'),
    (org_id, 'NET-UB-USW24P', '8901234500044', 'Ubiquiti UniFi Switch 24 PoE', '24-port managed PoE switch', (SELECT id FROM categories WHERE name='Networking' AND organization_id=org_id), 'Ubiquiti', 'piece', 380.00, 499.00, 8.0, 5, 8, 16, 80, 1.4, '44x28x4cm', 'ACTIVE'),
    (org_id, 'NET-CAT6-1M', '8901234500045', 'Cat6 Ethernet Cable 1m', 'Cat6 patch cable 1 meter', (SELECT id FROM categories WHERE name='Networking' AND organization_id=org_id), 'StarTech', 'piece', 2.50, 6.99, 8.0, 100, 200, 500, 2000, 0.05, '1m', 'ACTIVE'),
    (org_id, 'NET-CAT6-3M', '8901234500046', 'Cat6 Ethernet Cable 3m', 'Cat6 patch cable 3 meters', (SELECT id FROM categories WHERE name='Networking' AND organization_id=org_id), 'StarTech', 'piece', 3.50, 9.99, 8.0, 100, 200, 500, 2000, 0.08, '3m', 'ACTIVE'),

    -- Storage (6)
    (org_id, 'STO-SM-990PRO2T', '8901234500051', 'Samsung 990 PRO 2TB', '2TB NVMe M.2 SSD', (SELECT id FROM categories WHERE name='Storage' AND organization_id=org_id), 'Samsung', 'piece', 145.00, 199.00, 8.0, 20, 30, 60, 400, 0.01, '8x2.5x0.3cm', 'ACTIVE'),
    (org_id, 'STO-SM-T7-1T', '8901234500052', 'Samsung T7 Portable 1TB', '1TB portable USB-C SSD', (SELECT id FROM categories WHERE name='Storage' AND organization_id=org_id), 'Samsung', 'piece', 85.00, 119.00, 8.0, 25, 40, 80, 500, 0.06, '8x6x1.2cm', 'ACTIVE'),
    (org_id, 'STO-WD-BLACK-1T', '8901234500053', 'WD Black SN850X 1TB', '1TB NVMe gaming SSD', (SELECT id FROM categories WHERE name='Storage' AND organization_id=org_id), 'Western Digital', 'piece', 95.00, 139.00, 8.0, 20, 30, 60, 400, 0.01, '8x2.5x0.3cm', 'ACTIVE'),
    (org_id, 'STO-SE-EXHDD-4T', '8901234500054', 'Seagate Expansion 4TB', '4TB external HDD USB 3.0', (SELECT id FROM categories WHERE name='Storage' AND organization_id=org_id), 'Seagate', 'piece', 75.00, 109.00, 8.0, 25, 40, 80, 500, 0.25, '12x8x2cm', 'ACTIVE'),
    (org_id, 'STO-KS-32GB-USB', '8901234500055', 'Kingston DataTraveler 32GB', '32GB USB 3.2 flash drive', (SELECT id FROM categories WHERE name='Storage' AND organization_id=org_id), 'Kingston', 'piece', 6.50, 12.99, 8.0, 50, 100, 200, 1000, 0.01, '6x2x1cm', 'ACTIVE'),
    (org_id, 'STO-CR-MICRO-128', '8901234500056', 'Crucial MicroSD 128GB', '128GB microSDXC UHS-I card', (SELECT id FROM categories WHERE name='Storage' AND organization_id=org_id), 'Crucial', 'piece', 12.00, 19.99, 8.0, 40, 60, 120, 800, 0.001, '1.5x1x0.1cm', 'ACTIVE'),

    -- Peripherals (7)
    (org_id, 'PER-LG-MXM3S', '8901234500061', 'Logitech MX Master 3S', 'Premium wireless mouse', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Logitech', 'piece', 65.00, 99.00, 8.0, 30, 50, 100, 600, 0.14, '12x8x4cm', 'ACTIVE'),
    (org_id, 'PER-LG-MXKEYS', '8901234500062', 'Logitech MX Keys', 'Wireless illuminated keyboard', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Logitech', 'piece', 85.00, 119.00, 8.0, 25, 40, 80, 500, 0.51, '43x13x2cm', 'ACTIVE'),
    (org_id, 'PER-LG-GPROX', '8901234500063', 'Logitech G PRO X Superlight', 'Ultra-light gaming mouse', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Logitech', 'piece', 110.00, 159.00, 8.0, 20, 30, 60, 400, 0.06, '12x7x4cm', 'ACTIVE'),
    (org_id, 'PER-MS-SCULPT', '8901234500064', 'Microsoft Sculpt Ergonomic', 'Ergonomic wireless keyboard', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Microsoft', 'piece', 70.00, 99.00, 8.0, 15, 25, 50, 300, 0.5, '40x19x3cm', 'ACTIVE'),
    (org_id, 'PER-RA-BWV3', '8901234500065', 'Razer BlackWidow V3', 'Mechanical gaming keyboard', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Razer', 'piece', 90.00, 139.00, 8.0, 20, 30, 60, 400, 0.9, '44x14x4cm', 'ACTIVE'),
    (org_id, 'PER-CK-HS60', '8901234500066', 'Corsair HS60 Pro Surround', 'Wired gaming headset', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Corsair', 'piece', 55.00, 79.00, 8.0, 25, 40, 80, 500, 0.34, '20x19x8cm', 'ACTIVE'),
    (org_id, 'PER-LG-C920', '8901234500067', 'Logitech C920 HD Webcam', '1080p HD webcam', (SELECT id FROM categories WHERE name='Peripherals' AND organization_id=org_id), 'Logitech', 'piece', 50.00, 79.00, 8.0, 30, 50, 100, 600, 0.16, '9x4x4cm', 'ACTIVE'),

    -- Accessories (6)
    (org_id, 'ACC-AK-USBC-HUB', '8901234500071', 'Anker USB-C Hub 8-in-1', 'Multiport USB-C hub with HDMI and PD', (SELECT id FROM categories WHERE name='Accessories' AND organization_id=org_id), 'Anker', 'piece', 45.00, 69.00, 8.0, 30, 50, 100, 600, 0.08, '12x6x1.5cm', 'ACTIVE'),
    (org_id, 'ACC-AK-100W-CHG', '8901234500072', 'Anker 100W USB-C Charger', '100W GaN charger with 4 ports', (SELECT id FROM categories WHERE name='Accessories' AND organization_id=org_id), 'Anker', 'piece', 55.00, 89.00, 8.0, 25, 40, 80, 500, 0.2, '8x6x3cm', 'ACTIVE'),
    (org_id, 'ACC-BE-PB-10000', '8901234500073', 'Belkin Power Bank 10000mAh', '10000mAh portable charger USB-C', (SELECT id FROM categories WHERE name='Accessories' AND organization_id=org_id), 'Belkin', 'piece', 30.00, 49.00, 8.0, 30, 50, 100, 600, 0.22, '10x6x2.5cm', 'ACTIVE'),
    (org_id, 'ACC-MS-SURFACE-DK', '8901234500074', 'Microsoft Surface Dock 2', 'Docking station for Surface devices', (SELECT id FROM categories WHERE name='Accessories' AND organization_id=org_id), 'Microsoft', 'piece', 180.00, 259.00, 8.0, 10, 15, 30, 200, 0.5, '23x8x3cm', 'ACTIVE'),
    (org_id, 'ACC-DE-THUNDERBOLT4', '8901234500075', 'Dell Thunderbolt 4 Dock', 'Thunderbolt 4 docking station', (SELECT id FROM categories WHERE name='Accessories' AND organization_id=org_id), 'Dell', 'piece', 220.00, 319.00, 8.0, 8, 12, 24, 150, 0.45, '20x9x3cm', 'ACTIVE'),
    (org_id, 'ACC-HY-USBC-2M', '8901234500076', 'Hyper USB-C Cable 2m', '2m USB-C to USB-C cable 100W', (SELECT id FROM categories WHERE name='Accessories' AND organization_id=org_id), 'Hyper', 'piece', 15.00, 24.99, 8.0, 50, 100, 200, 1000, 0.08, '2m', 'ACTIVE'),

    -- Components (5)
    (org_id, 'CMP-KS-32GB-DDR5', '8901234500081', 'Kingston 32GB DDR5-5600', '32GB DDR5 RAM module 5600MHz', (SELECT id FROM categories WHERE name='Components' AND organization_id=org_id), 'Kingston', 'piece', 95.00, 139.00, 8.0, 15, 25, 50, 300, 0.08, '13x3x0.5cm', 'ACTIVE'),
    (org_id, 'CMP-CR-16GB-DDR4', '8901234500082', 'Crucial 16GB DDR4-3200', '16GB DDR4 RAM module 3200MHz', (SELECT id FROM categories WHERE name='Components' AND organization_id=org_id), 'Crucial', 'piece', 35.00, 54.99, 8.0, 25, 40, 80, 500, 0.08, '13x3x0.5cm', 'ACTIVE'),
    (org_id, 'CMP-IN-I5-13400', '8901234500083', 'Intel Core i5-13400', '10-core desktop processor', (SELECT id FROM categories WHERE name='Components' AND organization_id=org_id), 'Intel', 'piece', 165.00, 229.00, 8.0, 10, 15, 30, 200, 0.45, '4x4x0.5cm', 'ACTIVE'),
    (org_id, 'CMP-AM-R5-7600', '8901234500084', 'AMD Ryzen 5 7600', '6-core desktop processor', (SELECT id FROM categories WHERE name='Components' AND organization_id=org_id), 'AMD', 'piece', 180.00, 249.00, 8.0, 10, 15, 30, 200, 0.5, '4x4x0.5cm', 'ACTIVE'),
    (org_id, 'CMP-NV-RTX4060', '8901234500085', 'NVIDIA RTX 4060 8GB', '8GB GDDR6 graphics card', (SELECT id FROM categories WHERE name='Components' AND organization_id=org_id), 'NVIDIA', 'piece', 280.00, 379.00, 8.0, 8, 12, 24, 150, 0.7, '23x11x4cm', 'ACTIVE'),

    -- Software (4)
    (org_id, 'SFT-MS-OFF365-1Y', '8901234500091', 'Microsoft 365 Business 1-Year', '1-year subscription for 1 user', (SELECT id FROM categories WHERE name='Software' AND organization_id=org_id), 'Microsoft', 'license', 120.00, 179.00, 8.0, 30, 50, 100, 600, 0.05, '12x14x1cm', 'ACTIVE'),
    (org_id, 'SFT-AD-CC-1Y', '8901234500092', 'Adobe Creative Cloud 1-Year', '1-year all apps subscription', (SELECT id FROM categories WHERE name='Software' AND organization_id=org_id), 'Adobe', 'license', 420.00, 599.00, 8.0, 15, 25, 50, 300, 0.05, '12x14x1cm', 'ACTIVE'),
    (org_id, 'SFT-WN-PRO-RET', '8901234500093', 'Windows 11 Pro Retail', 'Windows 11 Pro retail license', (SELECT id FROM categories WHERE name='Software' AND organization_id=org_id), 'Microsoft', 'license', 140.00, 199.00, 8.0, 25, 40, 80, 500, 0.05, '12x14x1cm', 'ACTIVE'),
    (org_id, 'SFT-VM-FUS-PRO', '8901234500094', 'VMware Fusion Pro', 'Virtual machine software for Mac', (SELECT id FROM categories WHERE name='Software' AND organization_id=org_id), 'VMware', 'license', 120.00, 169.00, 8.0, 15, 25, 50, 300, 0.05, '12x14x1cm', 'ACTIVE'),

    -- Mobile Devices (3)
    (org_id, 'MOB-AP-IP15', '8901234500101', 'Apple iPhone 15 128GB', '128GB iPhone 15', (SELECT id FROM categories WHERE name='Mobile Devices' AND organization_id=org_id), 'Apple', 'piece', 730.00, 999.00, 8.0, 15, 25, 50, 300, 0.17, '15x7x0.8cm', 'ACTIVE'),
    (org_id, 'MOB-SM-S24U', '8901234500102', 'Samsung Galaxy S24 Ultra', '256GB Galaxy S24 Ultra', (SELECT id FROM categories WHERE name='Mobile Devices' AND organization_id=org_id), 'Samsung', 'piece', 880.00, 1199.00, 8.0, 12, 20, 40, 250, 0.23, '16x8x0.9cm', 'ACTIVE'),
    (org_id, 'MOB-AP-IPAD-PRO12', '8901234500103', 'Apple iPad Pro 12.9 M2', '12.9-inch iPad Pro with M2 chip', (SELECT id FROM categories WHERE name='Mobile Devices' AND organization_id=org_id), 'Apple', 'piece', 1100.00, 1499.00, 8.0, 8, 12, 24, 150, 0.68, '28x21x0.6cm', 'ACTIVE')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- WAREHOUSE INVENTORY
  -- ============================================================
  -- Create inventory for every product in every warehouse with varied stock
  SELECT array_agg(id ORDER BY sku) INTO prod_ids FROM products WHERE organization_id = org_id;

  FOR i IN 1..array_length(prod_ids, 1) LOOP
    -- Main DC: higher stock
    qty := floor(random() * 200) + 20;
    INSERT INTO warehouse_inventory (organization_id, warehouse_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, quantity_damaged)
    VALUES (org_id, wh_ids[1], prod_ids[i], qty, floor(random() * 10), floor(random() * 50), floor(random() * 5))
    ON CONFLICT DO NOTHING;

    -- East Coast: medium stock
    qty := floor(random() * 100) + 10;
    INSERT INTO warehouse_inventory (organization_id, warehouse_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, quantity_damaged)
    VALUES (org_id, wh_ids[2], prod_ids[i], qty, floor(random() * 5), floor(random() * 30), floor(random() * 3))
    ON CONFLICT DO NOTHING;

    -- West Coast: lower stock, some products low/out
    qty := floor(random() * 60);
    INSERT INTO warehouse_inventory (organization_id, warehouse_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, quantity_damaged)
    VALUES (org_id, wh_ids[3], prod_ids[i], qty, floor(random() * 3), floor(random() * 20), floor(random() * 2))
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
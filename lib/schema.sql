-- Manufacturing ERP Database Schema

-- Products/SKUs
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    region VARCHAR(100),
    country VARCHAR(100),
    customer_type VARCHAR(50), -- 'new', 'repeat'
    credit_limit DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    order_date DATE NOT NULL,
    status VARCHAR(50), -- 'pending', 'shipped', 'delivered', 'cancelled'
    total_amount DECIMAL(10,2),
    payment_status VARCHAR(50), -- 'pending', 'partial', 'paid', 'overdue'
    payment_due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES sales_orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    margin DECIMAL(10,2)
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    capacity INTEGER
);

-- Inventory Stock
CREATE TABLE IF NOT EXISTS inventory_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER REFERENCES warehouses(id),
    product_id INTEGER REFERENCES products(id),
    lot_number VARCHAR(100),
    quantity INTEGER NOT NULL,
    safety_stock INTEGER,
    expiry_date DATE,
    last_movement_date TIMESTAMP,
    valuation_method VARCHAR(20), -- 'FIFO', 'LIFO', 'AVERAGE'
    unit_value DECIMAL(10,2),
    UNIQUE(warehouse_id, product_id, lot_number)
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type VARCHAR(50), -- 'in', 'out', 'transfer', 'adjustment'
    warehouse_id INTEGER REFERENCES warehouses(id),
    product_id INTEGER REFERENCES products(id),
    lot_number VARCHAR(100),
    quantity INTEGER NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_type VARCHAR(50), -- 'production', 'sales', 'purchase', 'adjustment'
    reference_id INTEGER,
    notes TEXT
);

-- Production Processes
CREATE TABLE IF NOT EXISTS production_processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    standard_cycle_time INTEGER, -- minutes
    department VARCHAR(100)
);

-- Production Orders
CREATE TABLE IF NOT EXISTS production_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    process_id INTEGER REFERENCES production_processes(id),
    planned_quantity INTEGER NOT NULL,
    actual_quantity INTEGER,
    planned_start_date TIMESTAMP,
    actual_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    status VARCHAR(50), -- 'planned', 'in_progress', 'completed', 'cancelled'
    yield_percentage DECIMAL(5,2)
);

-- Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    material_id INTEGER REFERENCES products(id),
    quantity_required DECIMAL(10,4),
    unit_of_measure VARCHAR(20)
);

-- Material Consumption
CREATE TABLE IF NOT EXISTS material_consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    production_order_id INTEGER REFERENCES production_orders(id),
    material_id INTEGER REFERENCES products(id),
    planned_quantity DECIMAL(10,4),
    actual_quantity DECIMAL(10,4),
    variance_percentage DECIMAL(5,2),
    consumption_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Defects
CREATE TABLE IF NOT EXISTS production_defects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    production_order_id INTEGER REFERENCES production_orders(id),
    defect_code VARCHAR(50),
    defect_description TEXT,
    quantity INTEGER,
    defect_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    root_cause VARCHAR(200),
    corrective_action TEXT
);

-- Equipment/Assets
CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100),
    department VARCHAR(100),
    acquisition_date DATE,
    acquisition_cost DECIMAL(10,2),
    depreciation_rate DECIMAL(5,2)
);

-- Equipment Utilization
CREATE TABLE IF NOT EXISTS equipment_utilization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER REFERENCES equipment(id),
    date DATE NOT NULL,
    runtime_hours DECIMAL(5,2),
    downtime_hours DECIMAL(5,2),
    maintenance_hours DECIMAL(5,2),
    oee_percentage DECIMAL(5,2), -- Overall Equipment Effectiveness
    UNIQUE(equipment_id, date)
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    cost_center VARCHAR(50)
);

-- Financial Transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date DATE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    account_type VARCHAR(50), -- 'revenue', 'cogs', 'expense', 'asset', 'liability'
    account_subtype VARCHAR(100), -- 'sales', 'materials', 'labor', 'overhead', etc.
    amount DECIMAL(12,2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    description TEXT,
    is_fixed_cost BOOLEAN DEFAULT FALSE
);

-- Monthly Snapshots (for easier reporting)
CREATE TABLE IF NOT EXISTS monthly_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date DATE NOT NULL,
    metric_type VARCHAR(100),
    metric_subtype VARCHAR(100),
    dimension1 VARCHAR(100), -- product, customer, region, etc.
    dimension2 VARCHAR(100),
    value DECIMAL(15,2),
    count INTEGER,
    UNIQUE(snapshot_date, metric_type, metric_subtype, dimension1, dimension2)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product ON inventory_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_date ON production_orders(planned_start_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_date ON monthly_snapshots(snapshot_date);
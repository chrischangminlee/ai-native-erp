import { format, subDays, addDays, startOfMonth, endOfMonth } from 'date-fns';

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export async function seedDatabase(db) {
  console.log('Starting database seeding...');

  try {
    // Clear existing data
    const tables = [
      'monthly_snapshots', 'financial_transactions', 'equipment_utilization', 'equipment',
      'production_defects', 'material_consumption', 'bom', 'production_orders',
      'production_processes', 'inventory_transactions', 'inventory_stock', 'warehouses',
      'sales_order_items', 'sales_orders', 'customers', 'products', 'departments'
    ];
    
    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table}`);
    }

    // 1. Seed Departments
    const departments = [
      { code: 'SALES', name: 'Sales Department', cost_center: 'CC-100' },
      { code: 'PROD', name: 'Production Department', cost_center: 'CC-200' },
      { code: 'QA', name: 'Quality Assurance', cost_center: 'CC-300' },
      { code: 'LOG', name: 'Logistics', cost_center: 'CC-400' },
      { code: 'FIN', name: 'Finance', cost_center: 'CC-500' },
      { code: 'HR', name: 'Human Resources', cost_center: 'CC-600' }
    ];

    for (const dept of departments) {
      await db.runAsync(
        'INSERT INTO departments (code, name, cost_center) VALUES (?, ?, ?)',
        [dept.code, dept.name, dept.cost_center]
      );
    }

    // 2. Seed Products
    const productCategories = ['Electronics', 'Mechanical Parts', 'Assemblies', 'Raw Materials'];
    const products = [];
    
    for (let i = 1; i <= 50; i++) {
      const category = randomChoice(productCategories);
      const cost = randomFloat(10, 500);
      const margin = randomFloat(0.2, 0.5);
      const product = {
        sku: `SKU-${String(i).padStart(4, '0')}`,
        name: `Product ${i} - ${category}`,
        category: category,
        unit_cost: cost,
        selling_price: cost * (1 + margin)
      };
      products.push(product);
      
      await db.runAsync(
        'INSERT INTO products (sku, name, category, unit_cost, selling_price) VALUES (?, ?, ?, ?, ?)',
        [product.sku, product.name, product.category, product.unit_cost, product.selling_price]
      );
    }

    // 3. Seed Customers
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
    const countries = {
      'North America': ['USA', 'Canada', 'Mexico'],
      'Europe': ['Germany', 'France', 'UK', 'Italy'],
      'Asia Pacific': ['China', 'Japan', 'India', 'Australia'],
      'Latin America': ['Brazil', 'Argentina', 'Chile', 'Colombia']
    };

    for (let i = 1; i <= 100; i++) {
      const region = randomChoice(regions);
      const country = randomChoice(countries[region]);
      
      await db.runAsync(
        'INSERT INTO customers (code, name, region, country, customer_type, credit_limit) VALUES (?, ?, ?, ?, ?, ?)',
        [`CUST-${String(i).padStart(4, '0')}`, `Customer ${i}`, region, country, 
         i <= 30 ? 'new' : 'repeat', randomFloat(10000, 100000)]
      );
    }

    // 4. Seed Warehouses
    const warehouses = [
      { code: 'WH-001', name: 'Main Warehouse', location: 'New York, USA', capacity: 10000 },
      { code: 'WH-002', name: 'European Distribution Center', location: 'Frankfurt, Germany', capacity: 8000 },
      { code: 'WH-003', name: 'Asia Pacific Hub', location: 'Shanghai, China', capacity: 12000 },
      { code: 'WH-004', name: 'Raw Materials Storage', location: 'Chicago, USA', capacity: 15000 }
    ];

    for (const wh of warehouses) {
      await db.runAsync(
        'INSERT INTO warehouses (code, name, location, capacity) VALUES (?, ?, ?, ?)',
        [wh.code, wh.name, wh.location, wh.capacity]
      );
    }

    // 5. Seed Production Processes
    const processes = [
      { code: 'PROC-001', name: 'Assembly Line A', cycle_time: 30, department: 'PROD' },
      { code: 'PROC-002', name: 'Assembly Line B', cycle_time: 45, department: 'PROD' },
      { code: 'PROC-003', name: 'Quality Testing', cycle_time: 15, department: 'QA' },
      { code: 'PROC-004', name: 'Packaging', cycle_time: 10, department: 'PROD' }
    ];

    for (const proc of processes) {
      await db.runAsync(
        'INSERT INTO production_processes (code, name, standard_cycle_time, department) VALUES (?, ?, ?, ?)',
        [proc.code, proc.name, proc.cycle_time, proc.department]
      );
    }

    // 6. Seed Equipment
    const equipmentTypes = ['Assembly Robot', 'Conveyor Belt', 'Testing Machine', 'Packaging Machine'];
    
    for (let i = 1; i <= 20; i++) {
      await db.runAsync(
        'INSERT INTO equipment (code, name, type, department, acquisition_date, acquisition_cost, depreciation_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`EQ-${String(i).padStart(3, '0')}`, `Equipment ${i}`, randomChoice(equipmentTypes), 'PROD',
         format(subDays(new Date(), randomBetween(365, 1825)), 'yyyy-MM-dd'),
         randomFloat(50000, 500000), randomFloat(10, 20)]
      );
    }

    // 7. Generate transactional data for the last 12 months
    const today = new Date();
    const startDate = subDays(today, 365);

    // Sales Orders
    let orderNumber = 1000;
    for (let d = startDate; d <= today; d = addDays(d, 1)) {
      const ordersPerDay = randomBetween(5, 20);
      
      for (let i = 0; i < ordersPerDay; i++) {
        const customerId = randomBetween(1, 100);
        const orderDate = format(d, 'yyyy-MM-dd');
        const totalAmount = randomFloat(1000, 50000);
        const status = randomChoice(['pending', 'shipped', 'delivered']);
        const paymentStatus = status === 'delivered' ? randomChoice(['paid', 'pending', 'overdue']) : 'pending';
        
        // Insert order and get the ID
        const orderValues = [`SO-${orderNumber++}`, customerId, orderDate, status, totalAmount, paymentStatus,
           format(addDays(d, 30), 'yyyy-MM-dd')];
        
        await db.runAsync(
          `INSERT INTO sales_orders (order_number, customer_id, order_date, status, total_amount, payment_status, payment_due_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          orderValues
        );

        // Get the last inserted order ID
        const orderResult = await db.getAsync('SELECT last_insert_rowid() as lastID');
        const orderId = orderResult.lastID;

        // Add order items
        const itemCount = randomBetween(1, 5);
        for (let j = 0; j < itemCount; j++) {
          const productId = randomBetween(1, 50);
          const quantity = randomBetween(1, 100);
          const unitPrice = products[productId - 1].selling_price;
          const totalPrice = quantity * unitPrice;
          const margin = (unitPrice - products[productId - 1].unit_cost) * quantity;

          await db.runAsync(
            `INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, total_price, margin) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [orderId, productId, quantity, unitPrice, totalPrice, margin]
          );
        }
      }
    }

    // Inventory Stock and Transactions
    for (let whId = 1; whId <= 4; whId++) {
      for (let prodId = 1; prodId <= 50; prodId++) {
        const lotNumber = `LOT-${format(new Date(), 'yyyyMM')}-${randomBetween(1000, 9999)}`;
        const quantity = randomBetween(100, 1000);
        const safetyStock = Math.floor(quantity * 0.2);
        
        await db.runAsync(
          `INSERT INTO inventory_stock (warehouse_id, product_id, lot_number, quantity, safety_stock, expiry_date, valuation_method, unit_value) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [whId, prodId, lotNumber, quantity, safetyStock,
           format(addDays(today, randomBetween(90, 365)), 'yyyy-MM-dd'),
           'FIFO', products[prodId - 1].unit_cost]
        );

        // Generate inventory transactions
        for (let d = startDate; d <= today; d = addDays(d, randomBetween(1, 7))) {
          const transType = randomChoice(['in', 'out', 'transfer']);
          const transQty = randomBetween(10, 100);
          
          await db.runAsync(
            `INSERT INTO inventory_transactions (transaction_type, warehouse_id, product_id, lot_number, quantity, transaction_date, reference_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [transType, whId, prodId, lotNumber, transQty,
             format(d, 'yyyy-MM-dd HH:mm:ss'), randomChoice(['production', 'sales', 'purchase'])]
          );
        }
      }
    }

    // Production Orders
    let prodOrderNumber = 5000;
    for (let d = startDate; d <= today; d = addDays(d, 1)) {
      const ordersPerDay = randomBetween(3, 10);
      
      for (let i = 0; i < ordersPerDay; i++) {
        const productId = randomBetween(1, 30); // Only assembled products
        const processId = randomBetween(1, 4);
        const plannedQty = randomBetween(50, 500);
        const actualQty = Math.floor(plannedQty * randomFloat(0.9, 1.05));
        
        await db.runAsync(
          `INSERT INTO production_orders (order_number, product_id, process_id, planned_quantity, actual_quantity, 
           planned_start_date, actual_start_date, planned_end_date, actual_end_date, status, yield_percentage) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`PO-${prodOrderNumber++}`, productId, processId, plannedQty, actualQty,
           format(d, 'yyyy-MM-dd HH:mm:ss'), format(d, 'yyyy-MM-dd HH:mm:ss'),
           format(addDays(d, 1), 'yyyy-MM-dd HH:mm:ss'), format(addDays(d, 1), 'yyyy-MM-dd HH:mm:ss'),
           'completed', (actualQty / plannedQty * 100).toFixed(2)]
        );

        // Get the last inserted production order ID
        const prodOrderResult = await db.getAsync('SELECT last_insert_rowid() as lastID');
        const prodOrderId = prodOrderResult.lastID;

        // Add defects
        if (Math.random() < 0.3) { // 30% chance of defects
          const defectQty = randomBetween(1, Math.floor(actualQty * 0.05));
          await db.runAsync(
            `INSERT INTO production_defects (production_order_id, defect_code, defect_description, quantity, defect_date) 
             VALUES (?, ?, ?, ?, ?)`,
            [prodOrderId, `DEF-${randomBetween(100, 999)}`, 'Quality issue detected', defectQty,
             format(d, 'yyyy-MM-dd HH:mm:ss')]
          );
        }
      }
    }

    // Equipment Utilization
    for (let eqId = 1; eqId <= 20; eqId++) {
      for (let d = startDate; d <= today; d = addDays(d, 1)) {
        const runtime = randomFloat(0, 20);
        const downtime = randomFloat(0, 4);
        const maintenance = randomFloat(0, 2);
        const totalPossible = 24;
        const oee = ((runtime / totalPossible) * 100).toFixed(2);
        
        await db.runAsync(
          `INSERT INTO equipment_utilization (equipment_id, date, runtime_hours, downtime_hours, maintenance_hours, oee_percentage) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [eqId, format(d, 'yyyy-MM-dd'), runtime, downtime, maintenance, oee]
        );
      }
    }

    // Financial Transactions
    const accountTypes = [
      { type: 'revenue', subtypes: ['product_sales', 'service_revenue'] },
      { type: 'cogs', subtypes: ['materials', 'direct_labor', 'manufacturing_overhead'] },
      { type: 'expense', subtypes: ['salaries', 'rent', 'utilities', 'marketing', 'admin'] }
    ];

    for (let d = startDate; d <= today; d = addDays(d, 1)) {
      // Daily transactions
      for (const account of accountTypes) {
        for (const subtype of account.subtypes) {
          const deptId = randomBetween(1, 6);
          const amount = account.type === 'revenue' ? randomFloat(50000, 200000) :
                        randomFloat(10000, 50000);
          
          await db.runAsync(
            `INSERT INTO financial_transactions (transaction_date, department_id, account_type, account_subtype, amount, is_fixed_cost) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [format(d, 'yyyy-MM-dd'), deptId, account.type, subtype, amount,
             ['salaries', 'rent', 'utilities'].includes(subtype)]
          );
        }
      }
    }

    // Generate Monthly Snapshots
    for (let d = startDate; d <= today; d = addDays(d, 1)) {
      if (d.getDate() === 1 || d === startDate) { // Monthly snapshots
        const monthStr = format(d, 'yyyy-MM');
        
        // Sales metrics
        await db.runAsync(
          `INSERT INTO monthly_snapshots (snapshot_date, metric_type, metric_subtype, dimension1, value, count) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [monthStr + '-01', 'sales', 'revenue', 'total', randomFloat(1000000, 5000000), randomBetween(200, 500)]
        );

        // Inventory metrics
        await db.runAsync(
          `INSERT INTO monthly_snapshots (snapshot_date, metric_type, metric_subtype, dimension1, value, count) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [monthStr + '-01', 'inventory', 'stock_value', 'total', randomFloat(500000, 2000000), randomBetween(1000, 5000)]
        );

        // Production metrics
        await db.runAsync(
          `INSERT INTO monthly_snapshots (snapshot_date, metric_type, metric_subtype, dimension1, value, count) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [monthStr + '-01', 'production', 'output', 'total', randomFloat(10000, 50000), randomBetween(100, 300)]
        );

        // Finance metrics
        await db.runAsync(
          `INSERT INTO monthly_snapshots (snapshot_date, metric_type, metric_subtype, dimension1, value, count) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [monthStr + '-01', 'finance', 'profit', 'total', randomFloat(100000, 500000), 1]
        );
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
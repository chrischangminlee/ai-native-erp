import { getDb } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isInitialized = false;
let initPromise = null;

export async function initializeDatabase() {
  if (isInitialized) return;
  
  // Return existing promise if initialization is in progress
  if (initPromise) return initPromise;
  
  initPromise = doInitialize();
  return initPromise;
}

async function doInitialize() {
  const db = getDb();
  
  try {
    // Check if tables exist
    const tableCheck = await db.getAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='products'
    `);
    
    if (!tableCheck) {
      // Read and execute schema
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await db.runAsync(statement);
        }
      }
      
      // Import and run seed data
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase(db);
      
      console.log('Database initialized and seeded successfully');
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
    // Reset on error
    initPromise = null;
    throw error;
  }
}

// Initialize database on first import
await initializeDatabase();
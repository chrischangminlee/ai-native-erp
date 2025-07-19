import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.join(__dirname, 'erp.db'));

db.runAsync = promisify(db.run).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);

export async function initializeDatabase() {
  try {
    const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf-8');
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.runAsync(statement);
      }
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export function getDb() {
  return db;
}

export async function query(sql, params = []) {
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      return await db.allAsync(sql, params);
    } else {
      return await db.runAsync(sql, params);
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
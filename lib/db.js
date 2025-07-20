import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

let db;

export function getDb() {
  if (!db) {
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/erp.db' 
      : path.join(process.cwd(), 'erp.db');
    
    db = new sqlite3.Database(dbPath);
    
    db.runAsync = promisify(db.run).bind(db);
    db.getAsync = promisify(db.get).bind(db);
    db.allAsync = promisify(db.all).bind(db);
  }
  
  return db;
}

export async function query(sql, params = []) {
  const database = getDb();
  
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      return await database.allAsync(sql, params);
    } else {
      return await database.runAsync(sql, params);
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
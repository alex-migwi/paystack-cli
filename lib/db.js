import fs from 'fs';
import path from 'path';
import os from 'os';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const configDir = path.join(os.homedir(), '.config', 'paystack');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const configPath = path.join(configDir, 'config.json');

const defaultData = {
  token: '',
  token_expiry: 0,
  user: {},
  selected_integration: {},
  domain: 'test',
};

const adapter = new JSONFileSync(configPath);
const db = new LowSync(adapter, defaultData);

db.read();
if (!db.data) {
  db.data = { ...defaultData };
  db.write();
}

export function write(key, value) {
  db.read();
  db.data = db.data || { ...defaultData };
  db.data[key] = value;
  db.write();
}

export function read(key) {
  db.read();
  db.data = db.data || { ...defaultData };
  return db.data[key];
}

export function getAll() {
  db.read();
  return db.data || { ...defaultData };
}

export function clear() {
  db.data = { ...defaultData };
  db.write();
}

export function getConfigPath() {
  return configPath;
}

export default {
  read,
  write,
  getAll,
  clear,
  getConfigPath,
};

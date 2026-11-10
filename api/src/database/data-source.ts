import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation.js';
import { buildDataSourceOptions } from './database.options.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on variables already set in the environment.
}

export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));

import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'cafematch',
  migrations: ['src/database/migrations/*.ts'],
  // Fail fast if MySQL isn't responsive (default is 10s, we shorten to 5s)
  connectTimeout: 5000,
  extra: {
    connectTimeout: 5000,
  },
});

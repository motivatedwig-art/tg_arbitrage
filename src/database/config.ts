// src/database/config.ts
import { Sequelize } from 'sequelize';
import path from 'path';

const getDatabasePath = () => {
  if (process.env.VERCEL) {
    // Use in-memory SQLite for Vercel
    return ':memory:';
  }
  return process.env.DATABASE_URL || path.join(process.cwd(), 'database.sqlite');
};

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: getDatabasePath(),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// For Vercel, consider using a cloud database like PostgreSQL:
// export const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: 'postgres',
//   dialectOptions: {
//     ssl: {
//       require: true,
//       rejectUnauthorized: false
//     }
//   }
// });

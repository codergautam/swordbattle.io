require('dotenv').config();

interface ConfigProps {
  port: number;
  databaseURL: string;
  useSSL: boolean;
  jwtSecret: string;
  appSecret: string;
  serverSecret: string;
}

export const config: ConfigProps = {
  port: parseInt(process.env.PORT, 10) || 8080,
  databaseURL: process.env.DB_USERNAME && process.env.DB_PASSWORD && process.env.DB_HOST && process.env.DB_PORT
    ? `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}`
    : process.env.DB_URL || 'postgres://postgres:postgres@localhost:5433/',
  useSSL: Boolean(process.env.USE_SSL),
  jwtSecret: process.env.JWT_SECRET || 'jwt-secret',
  appSecret: process.env.APP_SECRET || 'app-secret',
  serverSecret: process.env.SERVER_SECRET || 'server-secret',
};

require('dotenv').config();

interface ConfigProps {
  isProduction: boolean;
  port: number;
  databaseURL: string;
  useSSL: boolean;
  appSecret: string;
  serverSecret: string;

  usernameWaitTime: number;
  usernameLength: [number, number];
}

export const config: ConfigProps = {
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 8080,
  databaseURL: process.env.DB_URL || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/postgres`,
  useSSL: (process.env.USE_SSL || '').toLowerCase() === 'true',
  appSecret: process.env.APP_SECRET || 'app-secret',
  serverSecret: process.env.SERVER_SECRET || 'server-secret',

  usernameWaitTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  usernameLength: [1, 16]
};

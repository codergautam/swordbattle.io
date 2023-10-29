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
  databaseURL: process.env.DB_URL || '',
  useSSL: Boolean(process.env.USE_SSL),
  jwtSecret: process.env.JWT_SECRET || 'jwt-secret',
  appSecret: process.env.APP_SECRET || 'app-secret',
  serverSecret: process.env.SERVER_SECRET || 'server-secret',
};

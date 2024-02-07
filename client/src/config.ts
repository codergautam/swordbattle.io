interface Config {
  basename: string;
  isDev: boolean;
  serverDev: string;
  serverEU: string;
  serverUS: string;
  serverUSBackup: string;
  apiEndpoint: string;
  apiEndpointBackup: string | undefined;
  viewportSize: number;
  cursorUrl?: string;
  recaptchaClientKey: string;
}

export const config: Config = {
  basename: process.env.REACT_APP_BASENAME || '',
  isDev: process.env.NODE_ENV === 'development',
  serverDev: process.env.REACT_APP_ENDPOINT_DEV || 'localhost:8000',
  serverEU: process.env.REACT_APP_ENDPOINT_EU || '',
  serverUS: process.env.REACT_APP_ENDPOINT_US || '',
  serverUSBackup: process.env.REACT_APP_ENDPOINT_US_BACKUP || '',
  apiEndpoint: process.env.REACT_APP_API || 'localhost:8080',
  apiEndpointBackup: process.env.REACT_APP_API_BACKUP,
  recaptchaClientKey: process.env.REACT_APP_RECAPTCHA_CLIENT_KEY || '',
  viewportSize: 1400,
  cursorUrl: "cursor: url(/assets/img/cursor.cur) 20 20, crosshair;"
};

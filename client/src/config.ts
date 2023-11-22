interface Config {
  basename: string;
  isDev: boolean;
  serverDev: string;
  serverEU: string;
  serverUS: string;
  apiEndpoint: string;
  viewportSize: number;
}

export const config: Config = {
  basename: process.env.REACT_APP_BASENAME || '',
  isDev: process.env.NODE_ENV === 'development',
  serverDev: process.env.REACT_APP_ENDPOINT_DEV || 'localhost:8000',
  serverEU: process.env.REACT_APP_ENDPOINT_EU || 'localhost:8000',
  serverUS: process.env.REACT_APP_ENDPOINT_US || 'localhost:8000',
  apiEndpoint: process.env.REACT_APP_API || 'localhost:8080',
  viewportSize: 1400,
};

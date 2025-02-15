import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { validateEnv } from '../utils/env';

// Validate environment variables at startup
const isEnvValid = validateEnv();
if (!isEnvValid && process.env.NODE_ENV === 'production') {
  console.error('Application startup failed: Invalid environment variables');
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();


  return <Component {...pageProps} />;
}

export default MyApp;

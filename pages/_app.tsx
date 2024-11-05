// pages/_app.tsx
import '@/styles/global.css';  // Make sure this path matches the actual location of your global.css file

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
import '../styles/global.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /today if the path is /
    if (router.pathname === '/') {
      router.push('/today');
    }
  }, [router]);

  return <Component {...pageProps} />;
}

export default MyApp;

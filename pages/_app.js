import "../styles/globals.css";
import { AuthProvider } from "../lib/auth";
import { ToastProvider } from "../components/Toast";
import CookieBanner from "../components/CookieBanner";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Component {...pageProps} />
        <CookieBanner />
      </ToastProvider>
    </AuthProvider>
  );
}

import "../styles/globals.css";
import { AuthProvider } from "../lib/auth";
import { ToastProvider } from "../components/Toast";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </AuthProvider>
  );
}

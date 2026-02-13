import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="sv">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0a1628" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        {/* Default Open Graph tags (can be overridden per page) */}
        <meta property="og:site_name" content="Bidragsguiden" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="sv_SE" />

        {/* Twitter card defaults */}
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

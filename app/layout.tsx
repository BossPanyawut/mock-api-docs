import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mock API Docs",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Sync localStorage to cookies for API access
              function syncEndpoints() {
                const endpoints = localStorage.getItem('mockEndpoints');
                if (endpoints) {
                  document.cookie = 'mockEndpoints=' + encodeURIComponent(endpoints) + '; path=/; max-age=86400';
                }
              }
              
              // Sync on load and storage changes
              syncEndpoints();
              window.addEventListener('storage', syncEndpoints);
              
              // Override fetch to include endpoints in headers
              const originalFetch = window.fetch;
              window.fetch = function(...args) {
                const [url, options = {}] = args;
                if (typeof url === 'string' && url.startsWith('/api/')) {
                  const endpoints = localStorage.getItem('mockEndpoints');
                  if (endpoints) {
                    options.headers = {
                      ...options.headers,
                      'x-mock-endpoints': endpoints
                    };
                  }
                }
                return originalFetch.apply(this, [url, options]);
              };
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}

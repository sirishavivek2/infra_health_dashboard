import "./globals.css";

export const metadata = {
  title: "Infrastructure Health Dashboard",
  description:
    "Register and monitor servers across your data centers — a production-shaped demo app.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <span className="logo">◈</span>
            <div>
              <h1>Infrastructure Health Dashboard</h1>
              <p className="tagline">Register &amp; monitor your fleet</p>
            </div>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="container footer">
          Next.js · PostgreSQL · Docker · GitHub Actions · Terraform
        </footer>
      </body>
    </html>
  );
}

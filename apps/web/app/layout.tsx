import "./globals.css";

export const metadata = {
  title: "TradeOS Core",
  description: "AI Operating System for International Trade",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import '../styles/homepage.css';
import '../styles/navbar.css';

export const metadata = {
  title: 'Student NFT Marketplace',
  description: 'Marketplace for student organizations',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

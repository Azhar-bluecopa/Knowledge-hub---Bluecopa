import './globals.css'

export const metadata = {
  title: 'Bluecopa Knowledge Hub',
  description: 'Internal knowledge base for the Bluecopa delivery organisation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

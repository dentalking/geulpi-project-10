import './globals.css';
import { ToastProvider } from '@/providers/ToastProvider';

export const metadata = {
  title: 'AI Calendar Assistant',
  description: 'Gemini AI가 당신의 일정을 똑똑하게 관리합니다',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

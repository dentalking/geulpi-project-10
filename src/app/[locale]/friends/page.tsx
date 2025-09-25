'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Settings } from 'lucide-react';
import { IntegratedFriendsList } from '@/components/IntegratedFriendsList';
import { useToastContext } from '@/providers/ToastProvider';

export default function FriendsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // JWT 인증 확인
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (authToken) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // Google OAuth 확인
      const accessToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];

      if (accessToken) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // 인증되지 않은 경우 로그인 페이지로 리다이렉트
      router.push('/auth/login');
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 뒤로 가기 버튼 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">뒤로</span>
              </button>
            </div>

            {/* 페이지 제목 */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">
                친구 관리
              </h1>
            </div>

            {/* 설정 버튼 */}
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="친구 설정"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <IntegratedFriendsList />
      </main>

      {/* 모바일 하단 네비게이션 (선택사항) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="flex flex-col items-center gap-1 px-3 py-2 text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs">대시보드</span>
          </button>

          <button
            className="flex flex-col items-center gap-1 px-3 py-2 text-blue-600"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">설정</span>
          </button>
        </div>
      </div>
    </div>
  );
}
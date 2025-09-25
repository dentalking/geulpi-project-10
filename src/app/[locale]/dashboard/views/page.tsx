'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Zap, Layers, Clock, Sparkles } from 'lucide-react';

export default function ViewsNavigationPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();

  const views = [
    {
      title: 'Layered AI Interface',
      description: '채팅이 메인, 캘린더는 배경',
      icon: Sparkles,
      path: `/${locale}/dashboard/layered`,
      gradient: 'from-purple-600 to-pink-600',
      badge: 'ULTIMATE'
    },
    {
      title: 'One Line Day',
      description: '하루를 한 줄로 표현하는 혁신적인 뷰',
      icon: Zap,
      path: `/${locale}/dashboard/line`,
      gradient: 'from-purple-500 to-pink-500',
      badge: 'SIGNATURE'
    },
    {
      title: 'One Line Week',
      description: '일주일을 7개의 라인으로 한눈에',
      icon: Layers,
      path: `/${locale}/dashboard/week-line`,
      gradient: 'from-blue-500 to-cyan-500',
      badge: 'NEW'
    },
    {
      title: 'One Line Month',
      description: '한 달을 하나의 타임라인으로',
      icon: Calendar,
      path: `/${locale}/dashboard/month-line`,
      gradient: 'from-orange-500 to-red-500',
      badge: 'NEW'
    },
    {
      title: 'Time Flow',
      description: '현재 시간 중심의 포커스 뷰',
      icon: Clock,
      path: `/${locale}/dashboard/flow`,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Traditional Calendar',
      description: '기존 캘린더 뷰',
      icon: Calendar,
      path: `/${locale}/dashboard`,
      gradient: 'from-gray-500 to-gray-600'
    }
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <motion.h1
          className="text-4xl font-thin text-white text-center mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Choose Your View
        </motion.h1>
        <motion.p
          className="text-gray-500 text-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          시간을 경험하는 새로운 방법
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {views.map((view, index) => {
            const Icon = view.icon;
            return (
              <motion.div
                key={view.path}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(view.path)}
                className="relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${view.gradient.replace('from-', '').replace('to-', '')})`
                  }}
                />
                <div className="relative bg-gray-900 p-6 rounded-2xl border border-gray-800 group-hover:border-gray-700 transition-all">
                  {view.badge && (
                    <span className={`absolute top-4 right-4 text-xs px-2 py-1 rounded-full ${
                      view.badge === 'ULTIMATE' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                      view.badge === 'SIGNATURE' ? 'bg-purple-600' : 'bg-blue-600'
                    } text-white font-semibold`}>
                      {view.badge}
                    </span>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${view.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-2">
                    {view.title}
                  </h3>

                  <p className="text-gray-400 text-sm">
                    {view.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-600 text-xs">
            Press <kbd className="px-2 py-1 bg-gray-800 rounded mx-1">ESC</kbd> to go back
          </p>
        </motion.div>
      </div>
    </div>
  );
}
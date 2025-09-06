'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Search as SearchIcon, 
  Calendar,
  Clock,
  MapPin,
  Filter,
  X,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useToastContext } from '@/providers/ToastProvider';
import { MobileHeader, MobileBottomNav } from '@/components/MobileNavigation';

export default function SearchPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToastContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    type: 'all',
    location: false
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error(t('search.emptyQuery'));
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Implement actual search API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock results for now
      setSearchResults([
        {
          id: '1',
          type: 'event',
          title: 'Team Meeting',
          date: new Date().toISOString(),
          location: 'Conference Room A'
        },
        {
          id: '2',
          type: 'event',
          title: 'Project Review',
          date: new Date(Date.now() + 86400000).toISOString(),
          location: 'Online'
        }
      ]);
      
      toast.success(t('search.resultsFound', { count: 2 }));
    } catch (error) {
      toast.error(t('search.error'));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse" 
             style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000" 
             style={{ background: 'var(--effect-pink)' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg transition-all md:hidden"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('search.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                       style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('search.placeholder')}
              className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-xl border transition-all"
              style={{ 
                background: 'var(--surface-primary)', 
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1"
                aria-label={t('common.clear')}
              >
                <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
        >
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all"
            style={{ 
              background: filters.dateRange !== 'all' ? 'var(--accent-primary)' : 'var(--surface-secondary)',
              borderColor: 'var(--border-default)',
              color: filters.dateRange !== 'all' ? 'white' : 'var(--text-primary)'
            }}
            onClick={() => setFilters(prev => ({ ...prev, dateRange: prev.dateRange === 'all' ? 'week' : 'all' }))}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{t('search.filters.dateRange')}</span>
          </button>
          
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all"
            style={{ 
              background: filters.location ? 'var(--accent-primary)' : 'var(--surface-secondary)',
              borderColor: 'var(--border-default)',
              color: filters.location ? 'white' : 'var(--text-primary)'
            }}
            onClick={() => setFilters(prev => ({ ...prev, location: !prev.location }))}
          >
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{t('search.filters.withLocation')}</span>
          </button>
          
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all"
            style={{ 
              background: 'var(--surface-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">{t('search.filters.more')}</span>
          </button>
        </motion.div>

        {/* Search Results */}
        <div className="space-y-4">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>{t('search.searching')}</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 backdrop-blur-xl rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                style={{ 
                  background: 'var(--surface-primary)', 
                  borderColor: 'var(--glass-border)' 
                }}
                onClick={() => router.push(`/dashboard?event=${result.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                       style={{ background: 'var(--surface-secondary)' }}>
                    <Calendar className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{result.title}</h3>
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(result.date).toLocaleDateString()}
                      </span>
                      {result.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {result.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : searchQuery ? (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p style={{ color: 'var(--text-secondary)' }}>{t('search.noResults')}</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p style={{ color: 'var(--text-secondary)' }}>{t('search.startSearching')}</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
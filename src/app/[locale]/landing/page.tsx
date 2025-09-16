'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { 
  ArrowRight, 
  Camera, 
  MapPin, 
  MessageSquare, 
  Clock, 
  Mic, 
  CheckCircle,
  Menu,
  X,
  Zap,
  Star,
  Upload,
  ScanLine,
  Calendar,
  Sparkles,
  Shield,
  Users
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import LanguageSelector from '@/components/LanguageSelector';

export default function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Camera,
      title: t('features.items.ocr.title'),
      description: t('features.items.ocr.description'),
      gradient: 'from-purple-500 to-pink-500',
      stats: t('features.items.ocr.stats')
    },
    {
      icon: MessageSquare,
      title: t('features.items.nlp.title'),
      description: t('features.items.nlp.description'),
      gradient: 'from-blue-500 to-cyan-500',
      stats: t('features.items.nlp.stats')
    },
    {
      icon: MapPin,
      title: t('features.items.location.title'),
      description: t('features.items.location.description'),
      gradient: 'from-green-500 to-emerald-500',
      stats: t('features.items.location.stats')
    },
    {
      icon: Mic,
      title: t('features.items.voice.title'),
      description: t('features.items.voice.description'),
      gradient: 'from-orange-500 to-red-500',
      stats: t('features.items.voice.stats')
    }
  ];

  const testimonials = [
    {
      name: t('testimonials.users.kim.name'),
      role: t('testimonials.users.kim.role'),
      content: t('testimonials.users.kim.content'),
      saved: t('testimonials.users.kim.saved'),
      avatar: '👩‍💼'
    },
    {
      name: t('testimonials.users.lee.name'),
      role: t('testimonials.users.lee.role'),
      content: t('testimonials.users.lee.content'),
      saved: t('testimonials.users.lee.saved'),
      avatar: '👨‍💻'
    },
    {
      name: t('testimonials.users.park.name'),
      role: t('testimonials.users.park.role'),
      content: t('testimonials.users.park.content'),
      saved: t('testimonials.users.park.saved'),
      avatar: '👩‍🎨'
    }
  ];

  const demoSteps = [
    {
      step: 1,
      title: t('demo.steps.upload.title'),
      description: t('demo.steps.upload.description'),
      icon: Upload,
      color: 'text-purple-400'
    },
    {
      step: 2,
      title: t('demo.steps.analyze.title'),
      description: t('demo.steps.analyze.description'),
      icon: ScanLine,
      color: 'text-pink-400'
    },
    {
      step: 3,
      title: t('demo.steps.register.title'),
      description: t('demo.steps.register.description'),
      icon: Calendar,
      color: 'text-blue-400'
    }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? 'backdrop-blur-xl border-b' : ''
      }`}
      style={{ 
        background: scrolled ? 'var(--glass-bg)' : 'transparent',
        borderColor: scrolled ? 'var(--glass-border)' : 'transparent'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Logo size={32} className="transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" style={{ background: 'var(--gradient-purple-pink)' }} />
              </div>
              <span className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>Geulpi</span>
              <span className="text-xs hidden md:inline" style={{ color: 'var(--text-quaternary)' }}>Geulpi</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                { key: 'features', label: t('navigation.features') },
                { key: 'pricing', label: t('navigation.pricing') },
                { key: 'testimonials', label: t('navigation.testimonials') },
                { key: 'contact', label: t('navigation.contact') }
              ].map((item) => (
                <a
                  key={item.key}
                  href={`#${item.key}`}
                  className="transition-colors text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <LanguageSelector />
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <Link
                href={`/${locale}/login`}
                className="px-6 py-2.5 rounded-full font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                style={{ 
                  background: 'var(--gradient-purple-pink)',
                  color: 'var(--text-on-accent)'
                }}
              >
                {t('hero.freeTrialButton').replace('14-Day ', '').replace('14일 ', '')}
              </Link>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t mt-4"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <div className="py-4 space-y-2">
                {[t('navigation.features'), t('navigation.pricing'), t('navigation.testimonials'), t('navigation.contact')].map((item) => (
                  <a
                    key={item}
                    href={`#${item}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-lg transition-all"
                    style={{ 
                      color: 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: 'var(--effect-purple)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000" style={{ background: 'var(--effect-pink)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl" style={{ background: 'var(--effect-gradient)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 border rounded-full text-sm" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--accent-primary)', opacity: '0.9' }}>
                <Zap className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span style={{ color: 'var(--accent-primary)' }}>{t('hero.badge')}</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('hero.title')}
              <br />
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {t('hero.subtitle')}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl mb-10 leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('hero.description').split('\n').map((line, index) => (
                <span key={index}>
                  {line}
                  {index === 0 && <br />}
                </span>
              ))}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Link
                href="/login"
                className="px-8 py-4 rounded-full font-semibold text-lg transition-all flex items-center gap-2 group shadow-lg hover:shadow-xl"
                style={{ 
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {t('hero.freeTrialButton')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#demo"
                className="px-8 py-4 backdrop-blur-sm rounded-full font-semibold text-lg transition-all border"
                style={{ 
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-default)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-elevated)';
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
              >
                {t('hero.demoButton')}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 flex items-center gap-8 text-sm"
              style={{ color: 'var(--text-quaternary)' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                <span>{t('hero.noCreditCard')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                <span>{t('hero.startIn5Min')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                <span>{t('hero.cancelAnytime')}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t('demo.title')}{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t('demo.titleHighlight')}
              </span>
            </h2>
            <p className="text-xl" style={{ color: 'var(--text-tertiary)' }}>
              {t('demo.subtitle')}
            </p>
          </motion.div>

          {/* 3-Step Demo Process */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {demoSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div 
                    className="backdrop-blur-sm rounded-2xl p-8 border transition-all"
                    style={{ 
                      background: 'var(--surface-primary)',
                      borderColor: 'var(--border-default)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl" style={{ background: 'var(--gradient-purple-pink)', color: 'var(--text-on-accent)' }}>
                        {step.step}
                      </div>
                      <Icon className={`w-8 h-8 ${step.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p style={{ color: 'var(--text-tertiary)' }}>{step.description}</p>
                  </div>
                  {index < demoSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 z-10">
                      <ArrowRight className="w-8 h-8" style={{ color: 'var(--text-quaternary)' }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Interactive Demo Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl p-12 border" 
            style={{ background: 'var(--effect-overlay)', borderColor: 'var(--border-default)' }}
          >
            <div className="text-center">
              <div 
                className="inline-flex items-center justify-center w-32 h-32 rounded-3xl mb-6 group cursor-pointer transition-all"
                style={{ background: 'var(--surface-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-primary)'}
              >
                <Upload className="w-16 h-16 group-hover:scale-110 transition-transform" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t('demo.uploadArea.dragDrop')}</h3>
              <p className="mb-8" style={{ color: 'var(--text-tertiary)' }}>{t('demo.uploadArea.clickToSelect')}</p>
              <button 
                className="px-8 py-3 rounded-full font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                style={{ 
                  background: 'var(--gradient-purple-pink)',
                  color: 'var(--text-on-accent)'
                }}
              >
                {t('demo.uploadArea.startDemo')}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl" style={{ color: 'var(--text-tertiary)' }}>
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: t('features.items.imageOcr.title'),
                description: t('features.items.imageOcr.description'),
                stats: t('features.items.imageOcr.stats')
              },
              {
                icon: ScanLine,
                title: t('features.items.textAnalysis.title'),
                description: t('features.items.textAnalysis.description'),
                stats: t('features.items.textAnalysis.stats')
              },
              {
                icon: MessageSquare,
                title: t('features.items.nlp.title'),
                description: t('features.items.nlp.description'),
                stats: t('features.items.nlp.stats')
              },
              {
                icon: Calendar,
                title: t('features.items.calendar.title'),
                description: t('features.items.calendar.description'),
                stats: t('features.items.calendar.stats')
              },
              {
                icon: MapPin,
                title: t('features.items.location.title'),
                description: t('features.items.location.description'),
                stats: t('features.items.location.stats')
              },
              {
                icon: Zap,
                title: t('features.items.oneClick.title'),
                description: t('features.items.oneClick.description'),
                stats: t('features.items.oneClick.stats')
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="backdrop-blur-sm rounded-2xl p-8 border transition-all group"
                  style={{ 
                    background: 'var(--surface-primary)',
                    borderColor: 'var(--border-default)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ background: 'var(--gradient-purple-pink)' }}>
                    <Icon className="w-7 h-7" style={{ color: 'var(--text-on-accent)' }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="mb-4" style={{ color: 'var(--text-tertiary)' }}>{feature.description}</p>
                  <div className="text-sm text-purple-400 font-medium">{feature.stats}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-xl" style={{ color: 'var(--text-tertiary)' }}>
              {t('testimonials.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl p-8 border"
                style={{ background: 'var(--effect-overlay)', borderColor: 'var(--border-default)' }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{testimonial.role}</div>
                  </div>
                </div>
                <p className="mb-6 italic" style={{ color: 'var(--text-secondary)' }}>"{testimonial.content}"</p>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{testimonial.saved}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-xl" style={{ color: 'var(--text-tertiary)' }}>
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="backdrop-blur-sm rounded-2xl p-8 border"
              style={{ 
                background: 'var(--surface-primary)',
                borderColor: 'var(--border-default)'
              }}
            >
              <h3 className="text-2xl font-bold mb-2">{t('pricing.plans.free.name')}</h3>
              <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>{t('pricing.plans.free.description')}</p>
              <div className="text-4xl font-bold mb-6">{t('pricing.plans.free.price')}<span className="text-base font-normal" style={{ color: 'var(--text-tertiary)' }}>{t('pricing.plans.free.priceUnit')}</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('pricing.plans.free.features.0')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('pricing.plans.free.features.1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('pricing.plans.free.features.2')}</span>
                </li>
              </ul>
              
              <Link 
                href="/login?plan=free" 
                className="block w-full py-3 rounded-full font-medium text-center transition-all"
                style={{ 
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-primary)'}
              >
                {t('pricing.plans.free.button')}
              </Link>
            </motion.div>

            {/* Pro Plan (Popular) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="backdrop-blur-sm rounded-2xl p-8 border relative"
              style={{ 
                background: 'var(--effect-overlay)', 
                borderColor: 'var(--accent-primary)' 
              }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold" style={{ background: 'var(--gradient-purple-pink)', color: 'var(--text-on-accent)' }}>
                {t('pricing.mostPopular')}
              </div>
              
              <h3 className="text-2xl font-bold mb-2">{t('pricing.plans.pro.name')}</h3>
              <p className="text-white/60 mb-6">{t('pricing.plans.pro.description')}</p>
              <div className="text-4xl font-bold mb-6">{t('pricing.plans.pro.price')}<span className="text-base font-normal text-white/60">{t('pricing.plans.pro.priceUnit')}</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.pro.features.0')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.pro.features.1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.pro.features.2')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.pro.features.3')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.pro.features.4')}</span>
                </li>
              </ul>
              
              <Link href="/login?plan=pro" className="block w-full py-3 hover:shadow-lg hover:shadow-purple-500/25 rounded-full font-medium text-center transition-all" style={{ background: 'var(--gradient-purple-pink)', color: 'var(--text-on-accent)' }}>
                {t('hero.freeTrialButton')}
              </Link>
            </motion.div>

            {/* Team Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="backdrop-blur-sm rounded-2xl p-8 border"
              style={{ 
                background: 'var(--surface-primary)',
                borderColor: 'var(--border-default)'
              }}
            >
              <h3 className="text-2xl font-bold mb-2">{t('pricing.plans.team.name')}</h3>
              <p className="text-white/60 mb-6">{t('pricing.plans.team.description')}</p>
              <div className="text-4xl font-bold mb-6">{t('pricing.plans.team.price')}<span className="text-base font-normal text-white/60">{t('pricing.plans.team.priceUnit')}</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.team.features.0')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.team.features.1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.team.features.2')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.team.features.3')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">{t('pricing.plans.team.features.4')}</span>
                </li>
              </ul>
              
              <Link href="/login?plan=team" className="block w-full py-3 rounded-full font-medium text-center transition-all" style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-elevated)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-primary)'}>
                {t('pricing.plans.team.button')}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl p-16" style={{ background: 'var(--cta-bg)' }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-xl mb-8 text-white/90">
              {t('cta.subtitle').split('\n').map((line, index) => (
                <span key={index}>
                  {line}
                  {index === 0 && <br />}
                </span>
              ))}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="px-8 py-4 rounded-full font-semibold text-lg transition-all" style={{ background: 'var(--cta-button-primary)', color: 'var(--cta-button-primary-text)' }}
              >
                {t('cta.startButton')}
              </Link>
              <Link
                href="/subscription"
                className="px-8 py-4 rounded-full font-semibold text-lg transition-all border" style={{ background: 'var(--cta-button-secondary)', color: 'var(--cta-button-secondary-text)', borderColor: 'var(--border-default)' }}
              >
                {t('cta.viewPlans')}
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-white/90">{t('cta.rating')} ({t('cta.reviews')})</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Logo size={24} />
                <span className="font-medium">Geulpi</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {t('footer.tagline').split('\n').map((line, index) => (
                  <span key={index}>
                    {line}
                    {index === 0 && <br />}
                  </span>
                ))}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product.title')}</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.product.features')}</a></li>
                <li><a href="#pricing" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.product.pricing')}</a></li>
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.product.updates')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t('footer.company.title')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.company.about')}</a></li>
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.company.careers')}</a></li>
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.company.blog')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t('footer.support.title')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.support.help')}</a></li>
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.support.contact')}</a></li>
                <li><a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.support.apiDocs')}</a></li>
              </ul>
            </div>
          </div>
          
          {/* Business Information for KakaoTalk Business Channel Approval */}
          <div className="pt-8 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="text-center mb-6">
              <h4 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>사업자 정보</h4>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                <p>상호: 옵티룸 | 대표자: 방희락</p>
                <p>사업자등록번호: 802-79-00585</p>
                <p>주소: 대전광역시 유성구 장대로 106, 2층 98A호</p>
                <p>이메일: support@geulpi.com</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-default)' }}>
            <div className="text-sm" style={{ color: 'var(--text-quaternary)' }}>
              {t('footer.copyright')}
            </div>

            <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <Link href="/terms" className="transition-colors" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>{t('footer.legal.terms')}</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">{t('footer.legal.privacy')}</Link>
              <Link href="/cookies" className="hover:text-white transition-colors">{t('footer.legal.cookies')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
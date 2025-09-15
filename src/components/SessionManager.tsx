'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Tablet, Globe, Shield, Clock, MapPin, LogOut, AlertCircle, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EnhancedToast } from './ui/EnhancedToast';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
  rememberMe: boolean;
}

export const SessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const response = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setToastMessage('Session revoked successfully');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error('Failed to revoke session');
      }
    } catch (error) {
      setToastMessage('Failed to revoke session');
      setToastType('error');
      setShowToast(true);
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    setRevoking('all');
    try {
      const response = await fetch('/api/auth/sessions?all=true', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.isCurrent));
        setToastMessage('All other sessions revoked');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error('Failed to revoke sessions');
      }
    } catch (error) {
      setToastMessage('Failed to revoke sessions');
      setToastType('error');
      setShowToast(true);
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const getSecurityScore = () => {
    let score = 60; // Base score
    if (sessions.length === 1) score += 20; // Only one active session
    if (sessions.every(s => s.rememberMe === false)) score += 10; // No remember me sessions
    if (sessions.length <= 3) score += 10; // Limited number of sessions
    return Math.min(score, 100);
  };

  const securityScore = getSecurityScore();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="p-6 rounded-2xl" style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)'
      }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-lg font-medium">Session Security</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{securityScore}</div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/100</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
          </div>
          {sessions.length > 3 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span>Consider reviewing your active sessions</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Active Sessions</h3>
          {sessions.length > 1 && (
            <button
              onClick={revokeAllOtherSessions}
              disabled={revoking === 'all'}
              className="px-4 py-2 text-sm rounded-xl transition-all"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error-color)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
            >
              {revoking === 'all' ? 'Revoking...' : 'Revoke All Others'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-4 rounded-xl"
              style={{
                background: 'var(--glass-bg)',
                border: session.isCurrent 
                  ? '2px solid var(--accent-primary)' 
                  : '1px solid var(--glass-border)'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg" style={{
                    background: session.isCurrent 
                      ? 'var(--accent-primary)' 
                      : 'var(--bg-tertiary)',
                    color: session.isCurrent 
                      ? 'white' 
                      : 'var(--text-secondary)'
                  }}>
                    {getDeviceIcon(session.device)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {session.browser} on {session.os}
                      </span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                background: 'var(--accent-primary)',
                                color: 'white'
                              }}>
                          Current
                        </span>
                      )}
                      {session.rememberMe && (
                        <span className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                background: 'rgba(251, 191, 36, 0.1)',
                                color: 'var(--warning-color)',
                                border: '1px solid rgba(251, 191, 36, 0.3)'
                              }}>
                          Remember Me
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm" 
                         style={{ color: 'var(--text-tertiary)' }}>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {session.ip}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Active {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                      Created {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    disabled={revoking === session.id}
                    className="p-2 rounded-lg transition-all hover:scale-110"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--error-color)'
                    }}
                  >
                    {revoking === session.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2"
                           style={{ borderColor: 'var(--error-color)' }}></div>
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Security Tips */}
      <div className="p-4 rounded-xl" style={{
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 className="font-medium mb-2">Security Tips</h4>
        <ul className="space-y-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <li>• Review your active sessions regularly</li>
          <li>• Revoke sessions you don't recognize</li>
          <li>• Use "Remember Me" only on trusted devices</li>
          <li>• Sign out when using shared computers</li>
        </ul>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <EnhancedToast
          id={`session-toast-${Date.now()}`}
          title={toastType === 'success' ? 'Success' : 'Error'}
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};
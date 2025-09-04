'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: billingCycle === 'monthly' ? 0 : 0,
      description: '시작하는 개인을 위한 기본 플랜',
      features: [
        '월 50개 일정',
        '월 10개 이미지 OCR 처리',
        'Google Calendar 연동',
        '기본 AI 어시스턴트',
        '자연어 일정 생성',
        '웹 앱 접속'
      ],
      limitations: [
        '이미지 OCR 제한',
        '팀 협업 불가',
        '패턴 학습 제한'
      ],
      cta: '무료로 시작',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: billingCycle === 'monthly' ? 9900 : 99000,
      description: '이미지 OCR로 생산성을 극대화',
      features: [
        '무제한 일정',
        '월 500개 이미지 OCR 처리',
        '모든 캘린더 연동',
        '고급 AI 어시스턴트',
        '자연어 + 이미지 복합 처리',
        '패턴 학습 & 예측',
        '스마트 알림',
        '우선 지원'
      ],
      limitations: [],
      cta: '프로 시작하기',
      popular: true
    },
    {
      id: 'team',
      name: 'Team',
      price: billingCycle === 'monthly' ? 29900 : 299000,
      description: '팀 전체의 일정을 스마트하게',
      features: [
        'Pro의 모든 기능',
        '무제한 이미지 OCR 처리',
        '팀원 무제한',
        '팀 캘린더 공유',
        '회의실 예약',
        '배치 이미지 처리',
        '관리자 대시보드',
        'API 접근',
        '전담 지원'
      ],
      limitations: [],
      cta: '팀 플랜 시작',
      popular: false
    }
  ];

  const formatPrice = (price: number) => {
    if (price === 0) return '무료';
    return `₩${price.toLocaleString()}`;
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    // 실제로는 결제 프로세스로 이동
    router.push(`/login?plan=${planId}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--apple-gray-01)',
      paddingTop: '48px'
    }}>
      {/* Navigation */}
      <nav className="nav-apple" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <div className="nav-container">
          <Link href="/landing" className="logo" style={{
            fontSize: '1.25rem',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--apple-black)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
            <span>Geulpi</span>
          </Link>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)'
          }}>
            <Link href="/landing" className="btn-apple-ghost">뒤로</Link>
            <Link href="/login" className="btn-apple btn-apple-primary">
              로그인
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: 'var(--space-10) var(--space-4) var(--space-8)',
        textAlign: 'center'
      }}>
        <h1 className="font-display" style={{
          marginBottom: 'var(--space-3)',
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          background: 'linear-gradient(180deg, var(--apple-black) 0%, var(--apple-gray-06) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          당신에게 맞는 플랜을 선택하세요
        </h1>
        
        <p className="font-body-large" style={{
          color: 'var(--apple-gray-06)',
          marginBottom: 'var(--space-6)',
          maxWidth: '600px',
          margin: '0 auto var(--space-6) auto'
        }}>
          언제든 업그레이드하거나 다운그레이드할 수 있습니다.<br />
          모든 플랜은 14일 무료 체험이 포함되어 있습니다.
        </p>

        {/* Billing Toggle */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-1)',
          background: 'var(--apple-white)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--apple-gray-03)',
          marginBottom: 'var(--space-8)'
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`btn-apple ${billingCycle === 'monthly' ? 'btn-apple-primary' : ''}`}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: billingCycle === 'monthly' ? 'var(--apple-black)' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--apple-white)' : 'var(--apple-gray-06)',
              border: 'none',
              fontSize: 'var(--font-body)'
            }}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`btn-apple ${billingCycle === 'yearly' ? 'btn-apple-primary' : ''}`}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: billingCycle === 'yearly' ? 'var(--apple-black)' : 'transparent',
              color: billingCycle === 'yearly' ? 'var(--apple-white)' : 'var(--apple-gray-06)',
              border: 'none',
              fontSize: 'var(--font-body)',
              position: 'relative'
            }}
          >
            연간 결제
            {billingCycle === 'yearly' && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: 'var(--apple-green)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 'var(--weight-semibold)'
              }}>
                -17%
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{
        padding: '0 var(--space-4) var(--space-10)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'stretch'
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="card-apple"
              style={{
                padding: 'var(--space-6)',
                position: 'relative',
                border: plan.popular ? '2px solid var(--apple-blue)' : '1px solid var(--apple-gray-03)',
                display: 'flex',
                flexDirection: 'column',
                background: plan.popular ? 'var(--apple-white)' : 'rgba(255, 255, 255, 0.8)',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--apple-blue)',
                  color: 'white',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-sm)',
                  fontWeight: 'var(--weight-semibold)'
                }}>
                  가장 인기
                </div>
              )}
              
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h3 className="font-heading" style={{
                  marginBottom: 'var(--space-2)',
                  color: 'var(--apple-black)'
                }}>
                  {plan.name}
                </h3>
                <p style={{
                  color: 'var(--apple-gray-06)',
                  fontSize: 'var(--font-body)',
                  marginBottom: 'var(--space-3)'
                }}>
                  {plan.description}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--space-1)',
                  marginBottom: 'var(--space-4)'
                }}>
                  <span style={{
                    fontSize: '2.5rem',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--apple-black)'
                  }}>
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span style={{
                      color: 'var(--apple-gray-05)',
                      fontSize: 'var(--font-body)'
                    }}>
                      /{billingCycle === 'monthly' ? '월' : '년'}
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ flex: 1, marginBottom: 'var(--space-5)' }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    fontSize: 'var(--font-sm)',
                    color: 'var(--apple-gray-05)',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--weight-medium)'
                  }}>
                    포함 기능
                  </div>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-2)',
                        color: 'var(--apple-gray-07)'
                      }}>
                        <span style={{
                          color: 'var(--apple-green)',
                          fontSize: '1rem',
                          marginTop: '2px'
                        }}>✓</span>
                        <span style={{ fontSize: 'var(--font-body)' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {plan.limitations.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: 'var(--font-sm)',
                      color: 'var(--apple-gray-05)',
                      marginBottom: 'var(--space-2)',
                      fontWeight: 'var(--weight-medium)'
                    }}>
                      제한 사항
                    </div>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0
                    }}>
                      {plan.limitations.map((limitation, idx) => (
                        <li key={idx} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--space-2)',
                          marginBottom: 'var(--space-2)',
                          color: 'var(--apple-gray-05)'
                        }}>
                          <span style={{ fontSize: '1rem', marginTop: '2px' }}>-</span>
                          <span style={{ fontSize: 'var(--font-body)' }}>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`btn-apple ${plan.popular ? 'btn-apple-primary' : 'btn-apple-secondary'}`}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 'var(--font-body)',
                  fontWeight: 'var(--weight-medium)'
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{
        padding: 'var(--space-8) var(--space-4) var(--space-10)',
        background: 'var(--apple-white)',
        borderTop: '1px solid var(--apple-gray-03)'
      }}>
        <div className="container">
          <h2 className="font-title text-center" style={{
            marginBottom: 'var(--space-6)',
            color: 'var(--apple-black)'
          }}>
            자주 묻는 질문
          </h2>
          
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'grid',
            gap: 'var(--space-4)'
          }}>
            <details className="card-apple card-apple-bordered" style={{
              padding: 'var(--space-4)',
              cursor: 'pointer'
            }}>
              <summary style={{
                fontWeight: 'var(--weight-medium)',
                marginBottom: 'var(--space-2)',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                언제든지 플랜을 변경할 수 있나요?
                <span>+</span>
              </summary>
              <p style={{
                color: 'var(--apple-gray-06)',
                paddingTop: 'var(--space-2)'
              }}>
                네, 언제든지 업그레이드하거나 다운그레이드할 수 있습니다. 
                변경사항은 다음 결제일부터 적용됩니다.
              </p>
            </details>
            
            <details className="card-apple card-apple-bordered" style={{
              padding: 'var(--space-4)',
              cursor: 'pointer'
            }}>
              <summary style={{
                fontWeight: 'var(--weight-medium)',
                marginBottom: 'var(--space-2)',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                환불 정책은 어떻게 되나요?
                <span>+</span>
              </summary>
              <p style={{
                color: 'var(--apple-gray-06)',
                paddingTop: 'var(--space-2)'
              }}>
                구매 후 14일 이내에는 100% 환불이 가능합니다. 
                이후에는 남은 기간에 대해 일할 계산하여 환불해드립니다.
              </p>
            </details>
            
            <details className="card-apple card-apple-bordered" style={{
              padding: 'var(--space-4)',
              cursor: 'pointer'
            }}>
              <summary style={{
                fontWeight: 'var(--weight-medium)',
                marginBottom: 'var(--space-2)',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                팀 플랜에서 멤버를 추가/제거할 수 있나요?
                <span>+</span>
              </summary>
              <p style={{
                color: 'var(--apple-gray-06)',
                paddingTop: 'var(--space-2)'
              }}>
                팀 플랜은 무제한 멤버를 지원합니다. 
                관리자 대시보드에서 언제든지 팀원을 추가하거나 제거할 수 있습니다.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-6) var(--space-4)',
        background: 'var(--apple-gray-02)',
        borderTop: '1px solid var(--apple-gray-03)'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.125rem',
            fontWeight: 'var(--weight-medium)'
          }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <span>Geulpi</span>
          </div>
          
          <div style={{
            fontSize: 'var(--font-micro)',
            color: 'var(--apple-gray-05)'
          }}>
            © 2024 Geulpi. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
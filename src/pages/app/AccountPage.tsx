import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { externalSupabase } from '@/lib/externalSupabase';
import { playMeow, playSqueak } from '@/lib/sounds';

const PRICE_PER_MONTH = 20;

interface SubscriptionData {
  plan: string;
  is_pro: boolean;
  expires_at: string | null;
  months_purchased: number | null;
  amount_paid: number | null;
  images_generated: number;
  videos_generated: number;
  images_limit: number;
  videos_limit: number;
  month_year: string;
}

const AccountPage: React.FC = () => {
  const { currentUser, currentUserName, selectedCharacter, selectCharacter } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data: { session } } = await externalSupabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubData(data);
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Handle payment return
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (payment === 'success' && sessionId) {
      setVerifyingPayment(true);
      (async () => {
        try {
          const { data: { session } } = await externalSupabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');

          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ session_id: sessionId }),
            }
          );
          const data = await res.json();
          if (data.success) {
            setMessage({ text: '✅ Payment verified! Your Pro plan is now active.', type: 'success' });
            await fetchSubscription();
          } else {
            setMessage({ text: '⚠️ Payment verification pending. Please refresh in a moment.', type: 'error' });
          }
        } catch {
          setMessage({ text: '❌ Failed to verify payment. Please contact support.', type: 'error' });
        } finally {
          setVerifyingPayment(false);
          setSearchParams({});
        }
      })();
    } else if (payment === 'cancelled') {
      setMessage({ text: '❌ Payment was cancelled. No charges were made.', type: 'error' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, fetchSubscription]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleCheckout = async () => {
    if (!currentUser?.id) return;
    setCheckoutLoading(true);
    setMessage(null);
    try {
      const { data: { session } } = await externalSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ months: selectedMonths }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setMessage({ text: `❌ ${err.message || 'Failed to start checkout'}`, type: 'error' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const totalPrice = selectedMonths === 12 ? 220 : selectedMonths * PRICE_PER_MONTH;
  const savings = selectedMonths === 12 ? PRICE_PER_MONTH : 0;

  const DURATION_OPTIONS = [
    { months: 1, label: '1 Month', price: 20 },
    { months: 3, label: '3 Months', price: 60 },
    { months: 6, label: '6 Months', price: 120 },
    { months: 12, label: '12 Months', price: 220, savings: 20 },
  ];

  if (loading || verifyingPayment) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{verifyingPayment ? '🔄' : '⏳'}</div>
          <p style={{ fontSize: '1.2rem' }}>{verifyingPayment ? 'Verifying your payment...' : 'Loading account...'}</p>
        </div>
      </div>
    );
  }

  const isPro = subData?.is_pro;

  const handleCharacterChange = async (char: 'leo' | 'milo') => {
    if (char === 'leo') playMeow();
    else playSqueak();
    await selectCharacter(char);
  };

  return (
    <div className="account-page" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', color: '#fff' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '5px', textAlign: 'center' }}>🛡️ Account Dashboard</h1>
      <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '30px' }}>Welcome back, {currentUserName}!</p>

      {message && (
        <div style={{
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: message.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255, 71, 87, 0.4)'}`,
          fontSize: '1rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Character Selection */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0, marginBottom: '15px', textAlign: 'center' }}>🎭 Your Character</h2>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleCharacterChange('leo')}
            style={{
              padding: '15px 25px',
              borderRadius: '14px',
              border: selectedCharacter === 'leo' ? '3px solid #4fc3f7' : '2px solid rgba(255,255,255,0.15)',
              background: selectedCharacter === 'leo' ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              textAlign: 'center' as const,
              transform: selectedCharacter === 'leo' ? 'scale(1.05)' : 'scale(1)',
              minWidth: '140px',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>🐱</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>Leo</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Smart & Wise</div>
            {selectedCharacter === 'leo' && <div style={{ fontSize: '0.7rem', color: '#4fc3f7', marginTop: '4px', fontWeight: 'bold' }}>✅ Active</div>}
          </button>
          <button
            onClick={() => handleCharacterChange('milo')}
            style={{
              padding: '15px 25px',
              borderRadius: '14px',
              border: selectedCharacter === 'milo' ? '3px solid #66bb6a' : '2px solid rgba(255,255,255,0.15)',
              background: selectedCharacter === 'milo' ? 'rgba(102,187,106,0.15)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              textAlign: 'center' as const,
              transform: selectedCharacter === 'milo' ? 'scale(1.05)' : 'scale(1)',
              minWidth: '140px',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>🐭</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>Milo</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Fun & Playful</div>
            {selectedCharacter === 'milo' && <div style={{ fontSize: '0.7rem', color: '#66bb6a', marginTop: '4px', fontWeight: 'bold' }}>✅ Active</div>}
          </button>
        </div>
      </div>

      {/* Current Plan */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '20px',
        border: isPro ? '2px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
              {isPro ? '🚀 Pro Plan' : '🌟 Free Plan'}
            </h2>
            <p style={{ opacity: 0.7, margin: '5px 0 0' }}>{currentUser?.email}</p>
          </div>
          <span style={{
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            background: isPro ? 'linear-gradient(135deg, #f9ca24, #f0932b)' : 'rgba(255,255,255,0.1)',
            color: isPro ? '#000' : '#fff',
          }}>
            {isPro ? 'ACTIVE' : 'FREE TIER'}
          </span>
        </div>

        {isPro && subData?.expires_at && (() => {
          const expiryDate = new Date(subData.expires_at);
          const now = new Date();
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpiringSoon = daysLeft <= 7;
          return (
            <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                📅 <strong>Expires:</strong> {expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: isExpiringSoon ? '#ff6b6b' : '#2ed573', fontWeight: isExpiringSoon ? 'bold' : 'normal' }}>
                ⏳ {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : 'Expired'}
                {isExpiringSoon && daysLeft > 0 && ' — Renew soon!'}
              </p>
              {subData.months_purchased && (
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem', opacity: 0.7 }}>
                  Duration: {subData.months_purchased} month{subData.months_purchased > 1 ? 's' : ''} • Paid: ${subData.amount_paid}
                </p>
              )}
            </div>
          );
        })()}

        {!isPro && (
          <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>
              📌 Upgrade to Pro to unlock 100 images/month, 3 extra Pro games, and early access to new updates.
            </p>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0, marginBottom: '15px' }}>📊 Monthly Usage ({subData?.month_year})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {/* Images */}
          <div style={{ background: 'rgba(79,195,247,0.1)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🖼️</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Images Generated</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '5px 0' }}>
              {subData?.images_generated || 0} / {subData?.images_limit || 20}
            </div>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                borderRadius: '3px',
                width: `${Math.min(100, ((subData?.images_generated || 0) / (subData?.images_limit || 20)) * 100)}%`,
                background: 'linear-gradient(90deg, #4fc3f7, #0288d1)',
                transition: 'width 0.5s',
              }} />
            </div>
          </div>
          {/* Pro Games Access (replaces video stats — video generation removed) */}
          <div style={{ background: 'rgba(156,39,176,0.1)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🎮</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Pro Games Access</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '5px 0' }}>
              {isPro ? '6 / 6 games' : '3 / 6 games'}
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: '3px',
                width: isPro ? '100%' : '50%',
                background: 'linear-gradient(90deg, #ce93d8, #9c27b0)',
                transition: 'width 0.5s',
              }} />
            </div>
            {!isPro && <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '8px 0 0' }}>🔒 3 extra games unlocked with Pro</p>}
            {isPro && <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '8px 0 0' }}>🚀 Pro users get early & quick access to new updates</p>}
          </div>
        </div>

        {/* Usage reset notice */}
        <div style={{
          marginTop: '15px',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          border: '1px dashed rgba(255,255,255,0.15)',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
            🔄 Your usage credits reset automatically on the <strong>1st of every month</strong>.
          </p>
        </div>
      </div>

      {/* Upgrade Section */}
      {!isPro && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(249,202,36,0.1), rgba(240,147,43,0.1))',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '20px',
          border: '2px solid rgba(249,202,36,0.3)',
        }}>
          <h2 style={{ fontSize: '1.3rem', marginTop: 0, marginBottom: '5px' }}>🚀 Upgrade to Pro</h2>
          <p style={{ opacity: 0.7, marginBottom: '20px', fontSize: '0.9rem' }}>
            Get 100 images/month, 3 extra Pro games (6 games total), and early & quick access to new updates!
          </p>

          {/* Duration Toggle Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Select Duration:
            </label>
            <div style={{
              display: 'flex',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.months}
                  onClick={() => setSelectedMonths(opt.months)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    border: 'none',
                    background: selectedMonths === opt.months
                      ? 'linear-gradient(135deg, rgba(249,202,36,0.3), rgba(240,147,43,0.3))'
                      : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: selectedMonths === opt.months ? 'bold' : 'normal',
                    fontSize: '0.8rem',
                    position: 'relative',
                    transition: 'all 0.2s',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>${opt.price}</div>
                  {opt.savings && (
                    <span style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '2px',
                      background: '#ff6b6b',
                      color: '#fff',
                      fontSize: '0.55rem',
                      padding: '1px 4px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                    }}>SAVE ${opt.savings}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>💰 Price Breakdown</h3>
            {selectedMonths === 12 ? (
              <>
                <p style={{ margin: '5px 0' }}>12 months × $20/month = <s>$240</s></p>
                <p style={{ margin: '5px 0', color: '#2ed573', fontWeight: 'bold' }}>
                  🎉 Special offer: Pay for 11 months only!
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>Total: $220 (Save ${savings}!)</p>
              </>
            ) : (
              <>
                <p style={{ margin: '5px 0' }}>{selectedMonths} month{selectedMonths > 1 ? 's' : ''} × $20/month</p>
                <p style={{ margin: '5px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>Total: ${totalPrice}</p>
              </>
            )}
            <p style={{ margin: '10px 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
              💳 One-time payment • No auto-renewal • No automatic charges
            </p>
          </div>

          {/* Warning */}
          <div style={{
            background: 'rgba(255, 71, 87, 0.1)',
            border: '1px solid rgba(255, 71, 87, 0.3)',
            borderRadius: '10px',
            padding: '12px 15px',
            marginBottom: '20px',
            fontSize: '0.85rem',
          }}>
            ⚠️ <strong>Important:</strong> Once payment is processed, it is <strong>non-refundable</strong>. 
            By proceeding, you acknowledge that all payments are final and cannot be reversed. 
            An invoice will be sent to your email after payment.
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              background: checkoutLoading ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #f9ca24, #f0932b)',
              color: '#000',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: checkoutLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {checkoutLoading ? '⏳ Redirecting to payment...' : `💳 Pay $${totalPrice} — Upgrade to Pro`}
          </button>
        </div>
      )}

      {/* Pro user info */}
      {isPro && (
        <div style={{
          background: 'rgba(46,213,115,0.08)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(46,213,115,0.2)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '1.1rem', margin: 0 }}>🎉 You're on the <strong>Pro Plan</strong>! Enjoy all premium features.</p>
          <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: '8px 0 0' }}>
            Your subscription will expire on {subData?.expires_at ? new Date(subData.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}. 
            You can renew anytime before it expires.
          </p>
        </div>
      )}

      {/* Plan Comparison */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '25px',
        marginTop: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0, marginBottom: '15px', textAlign: 'center' }}>📋 Plan Comparison</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Feature</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>🌟 Free</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>🚀 Pro ($20/mo)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Chat Messages', 'Unlimited', 'Unlimited'],
                ['Images/Month', '20', '100'],
                ['Games', '3', '6 (3 extra Pro)'],
                ['Early Access to Updates', '❌', '✅'],
                ['All Activities', '✅', '✅'],
                ['Social Stories', '✅', '✅'],
                ['Priority Support', '❌', '✅'],
              ].map(([feature, free, pro], i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px' }}>{feature}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{free}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={async () => {
          setRefreshing(true);
          setLoading(true);
          await fetchSubscription();
          setRefreshing(false);
        }}
        disabled={refreshing}
        style={{
          display: 'block',
          margin: '20px auto',
          padding: '8px 20px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: refreshing ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: '#fff',
          cursor: refreshing ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          opacity: 0.7,
        }}
      >
        {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Status'}
      </button>
    </div>
  );
};

export default AccountPage;

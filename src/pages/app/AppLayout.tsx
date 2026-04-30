import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { bannerMessages } from '@/data/gameData';
import { apiContact } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const navItems = [
  { path: '/app/gallery', icon: '🖼️', label: 'My Gallery', desc: 'View your saved images', highlight: true },
  { path: '/app/account', icon: '🛡️', label: 'My Account', desc: 'Plan, usage & billing' },
  { path: '/app/chat', icon: '💬', label: 'General Chat', desc: 'Ask about anything' },
  { path: '/app/games', icon: '🎮', label: 'Games', desc: 'Play fun learning games!' },
  { path: '/app/feelings', icon: '😊', label: 'Feelings Helper', desc: 'Share your feelings' },
  { path: '/app/calm-breathing', icon: '🫁', label: 'Calm Breathing', desc: 'Relax with gentle sounds' },
  { path: '/app/social-stories', icon: '📚', label: 'Social Stories', desc: 'Learn through visual stories' },
];

const AppLayout: React.FC = () => {
  const { logout } = useAuth();
  const { changeTheme, themeBackground } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [cResult, setCResult] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cEmail || !cMsg) { setCResult('❌ Please fill in all fields'); return; }
    setCLoading(true);
    try {
      await apiContact(cName, cEmail, cMsg);
      setCResult('✅ Message sent successfully!');
      setCName(''); setCEmail(''); setCMsg('');
    } catch { setCResult('❌ Failed to send message.'); }
    setCLoading(false);
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
    navigate('/app/chat');
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    navigate('/', { replace: true });
    logout();
  };

  useEffect(() => {
    const timer = setTimeout(() => setBannerVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.pathname === '/app') {
      navigate('/app/chat', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Close sidebar on mobile after navigation
  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  // On desktop, default sidebar open
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="app-layout" style={{ background: themeBackground }}>
      {/* Banner */}
      <div className={`floating-banner ${bannerVisible ? 'show' : ''}`}>
        <div className="banner-content">
          <span className="banner-icon">{bannerMessages[bannerIndex].icon}</span>
          <span className="banner-text" dangerouslySetInnerHTML={{ __html: bannerMessages[bannerIndex].text }} />
          <button className="banner-close" onClick={() => setBannerVisible(false)}>×</button>
        </div>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div className="auth-modal" style={{ display: 'flex' }}>
          <div className="terms-content" style={{ maxWidth: '500px', maxHeight: '90vh' }}>
            <div className="terms-header">
              <h2>📧 Contact Us</h2>
              <p className="terms-subtitle">Send us a message and we'll get back to you</p>
            </div>
            <div className="terms-body" style={{ padding: '20px' }}>
              <form onSubmit={handleContactSubmit}>
                <div className="form-group-auth" style={{ marginBottom: '15px' }}>
                  <label className="form-label-auth">Your Name</label>
                  <input type="text" className="form-input-auth" placeholder="Enter your name" value={cName} onChange={e => setCName(e.target.value)} required />
                </div>
                <div className="form-group-auth" style={{ marginBottom: '15px' }}>
                  <label className="form-label-auth">Email Address</label>
                  <input type="email" className="form-input-auth" placeholder="your@email.com" value={cEmail} onChange={e => setCEmail(e.target.value)} required />
                </div>
                <div className="form-group-auth" style={{ marginBottom: '15px' }}>
                  <label className="form-label-auth">Message</label>
                  <textarea className="form-input-auth" placeholder="Tell us how we can help..." rows={4} value={cMsg} onChange={e => setCMsg(e.target.value)} required style={{ resize: 'vertical', minHeight: '80px' }} />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={cLoading} style={{ width: '100%', marginBottom: '10px' }}>
                  <span>{cLoading ? 'Sending... ⏳' : 'Send Message 📤'}</span>
                </button>
                {cResult && <p className={cResult.includes('✅') ? 'auth-success-message' : 'auth-error-message'} style={{ display: 'block' }}>{cResult}</p>}
              </form>
            </div>
            <div className="terms-actions" style={{ borderTop: 'none' }}>
              <button className="auth-btn exit-btn" onClick={() => setShowContact(false)} style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', color: 'white', fontWeight: 'bold' }}>
                🚪 Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="auth-modal" style={{ display: 'flex' }}>
          <div className="terms-content" style={{ maxWidth: '420px' }}>
            <div className="terms-header">
              <h2>🚪 Confirm Logout</h2>
              <p className="terms-subtitle">Are you sure you want to logout?</p>
            </div>
            <div className="terms-actions" style={{ borderTop: 'none' }}>
              <button className="auth-btn signin-btn" onClick={handleLogoutCancel}>
                Cancel
              </button>
              <button
                className="auth-btn"
                onClick={handleLogoutConfirm}
                style={{ background: 'linear-gradient(135deg, #ff4d4f, #c62828)', color: 'white', fontWeight: 'bold' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="app-toolbar">
        <div className="toolbar-left">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
          </button>
          <span className="toolbar-brand">Sendelightgifts   AiBuddy</span>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="toolbar-actions">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="toolbar-btn" onClick={() => handleNavClick('/app/account')}>
                  <span className="toolbar-btn-icon">🛡️</span>
                  <span className="toolbar-btn-label">Account</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>My Account</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="toolbar-btn theme-btn" onClick={changeTheme}>
                  <span className="toolbar-btn-icon">🎨</span>
                  <span className="toolbar-btn-label">Theme</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Change Theme</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://sendelightgifts.com/donations/" target="_blank" rel="noopener noreferrer">
                  <button className="toolbar-btn donate-btn">
                    <span className="toolbar-btn-icon">💛</span>
                    <span className="toolbar-btn-label">Donate</span>
                  </button>
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Support Us</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="toolbar-btn contact-btn" onClick={() => setShowContact(true)}>
                  <span className="toolbar-btn-icon">📧</span>
                  <span className="toolbar-btn-label">Contact</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Contact Us</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="toolbar-btn logout-btn" onClick={handleLogoutClick}>
                  <span className="toolbar-btn-icon">🚪</span>
                  <span className="toolbar-btn-label">Logout</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Logout</p></TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Main body */}
      <div className="app-body">
        {/* Overlay for mobile */}
        {isMobile && sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">📚 Activities</span>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.path}
                className={`sidebar-nav-item ${location.pathname === item.path || (item.path === '/app/games' && location.pathname.startsWith('/app/games')) ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.desc}</span>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="app-content">
          <div className="chat-area">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

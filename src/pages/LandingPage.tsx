import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiContact } from '@/lib/api';
import { externalSupabase } from '@/lib/externalSupabase';
import TermsModal from '@/components/TermsModal';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Auto-redirect if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      // Check admin session
      const savedRole = localStorage.getItem('userRole');
      const savedToken = localStorage.getItem('sessionToken');
      const redirectPath = localStorage.getItem('redirectAfterAuth');
      const targetPath = redirectPath || '/app/chat';
      if (savedRole && savedToken) {
        if (redirectPath) localStorage.removeItem('redirectAfterAuth');
        navigate(targetPath, { replace: true });
        return;
      }
      // Check Supabase session
      try {
        const { data: { session } } = await externalSupabase.auth.getSession();
        if (session?.user) {
          if (redirectPath) localStorage.removeItem('redirectAfterAuth');
          navigate(targetPath, { replace: true });
        }
      } catch {}
    };
    checkSession();
  }, [navigate]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMsg, setContactMsg] = useState({ text: '', type: '' });
  const [showTerms, setShowTerms] = useState(false);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) { setContactMsg({ text: '❌ Please fill in all fields', type: 'error' }); return; }
    setContactLoading(true);
    try {
      const result = await apiContact(contactName, contactEmail, contactMessage);
      setContactMsg({ text: '✅ Message sent successfully!', type: 'success' });
      setContactName(''); setContactEmail(''); setContactMessage('');
    } catch { setContactMsg({ text: '❌ Failed to send message.', type: 'error' }); }
    setContactLoading(false);
  };

  return (
    <div className="landing-page" style={{ display: 'block' }}>
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="nav-logo-text">Sendelightgifts   AiBuddy</span>
          </div>
          <div className="nav-links" style={mobileMenuOpen ? { display: 'flex', flexDirection: 'column', position: 'absolute', top: '70px', right: '20px', background: 'rgba(26,26,46,0.98)', padding: '20px', borderRadius: '15px', border: '2px solid rgba(79,195,247,0.3)' } : {}}>
            <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#pricing" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
            <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a>
            <button className="nav-btn signin" onClick={() => navigate('/signin')}>Sign In</button>
            <button className="nav-btn signup" onClick={() => navigate('/signup')}>Sign Up</button>
            <button className="nav-btn admin" onClick={() => navigate('/enterprise')}>Enterprise</button>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-logo-above-title">
              <img src="/logo.png" alt="Sendelightgifts Logo" loading="eager" fetchPriority="high" width="300" height="300" style={{ maxWidth: '300px', height: 'auto',position: 'relative',left: '-75px', filter: 'drop-shadow(0 0 20px rgba(79, 195, 247, 0.6)) drop-shadow(0 0 40px rgba(79, 195, 247, 0.3))' }} />
            </div>
            <h1 className="hero-title">Welcome to Your<br /><span className="hero-highlight">Friendly Learning Assistant</span></h1>
            <p className="hero-subtitle">A safe, fun, and interactive learning companion designed especially for children. Chat with Leo & Milo and discover a world of learning! 🐱🐭</p>
            <div className="hero-buttons">
              <button className="hero-btn primary" onClick={() => navigate('/signup')}>Get Started Free</button>
              <button className="hero-btn secondary" onClick={() => scrollToSection('features')}>Learn More</button>
            </div>
            <div className="hero-stats">
              <div className="stat-item"><div className="stat-number">1M+</div><div className="stat-label">Students We Aim To Reach</div></div>
              <div className="stat-item"><div className="stat-number">100%</div><div className="stat-label">Safe & Secure</div></div>
              <div className="stat-item"><div className="stat-number">24/7</div><div className="stat-label">Available</div></div>
            </div>
          </div>
          <div className="hero-image hero-image-desktop-only">
            <div className="hero-characters">
              <div className="hero-character leo-hero">🐱</div>
              <div className="hero-character milo-hero">🐭</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-container">
          <h2 className="section-title">✨ Amazing Features</h2>
          <p className="section-subtitle">Everything your child needs for a fun and safe learning experience</p>
          <div className="features-grid">
            {[
              { icon: '💬', title: 'Interactive Chat', desc: 'Chat with friendly AI characters Leo & Milo who make learning fun and engaging!' },
              { icon: '🎨', title: 'Image Generation', desc: 'Create beautiful, child-friendly images to enhance learning and creativity.' },
              { icon: '🎮', title: 'Fun Games', desc: 'Memory games, color matching, shapes, and more educational activities!' },
              { icon: '😊', title: 'Feelings Helper', desc: 'A safe space to express emotions and learn about feelings with empathy.' },
              { icon: '📚', title: 'Social Stories', desc: 'Visual stories that help children understand social situations better.' },
              { icon: '🫁', title: 'Calm Breathing', desc: 'Relaxing breathing exercises with gentle sounds for emotional regulation.' },
              { icon: '🔒', title: 'Safe & Secure', desc: 'Child-safe content with filtering and parental controls for peace of mind.' },
              { icon: '📊', title: 'Progress Tracking', desc: 'Level up system and achievements to motivate continuous learning!' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-description">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="section-container">
          <h2 className="section-title">💎 Choose Your Plan</h2>
          <p className="section-subtitle">Start free and upgrade anytime as you grow</p>
          <div className="pricing-grid">
            <div className="pricing-card free-plan">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-icon">🌟</div>
              <h3 className="pricing-title">Free</h3>
              <div className="pricing-price"><span className="price-amount">$0</span><span className="price-period">/forever</span></div>
              <ul className="pricing-features">
                <li>✅ Unlimited chat messages</li><li>✅ 20 images per month</li><li>✅ All learning activities</li>
                <li>✅ 3 games (Colors, Shapes, Memory)</li><li>✅ Feelings helper</li><li>✅ Calm breathing exercises</li>
                <li>❌ 3 extra Pro games</li><li>❌ Early access to new updates</li><li>❌ Priority support</li>
              </ul>
              <button className="pricing-btn free-btn" onClick={() => navigate('/signup')}>Start Learning Free</button>
            </div>
            <div className="pricing-card pro-plan">
              <div className="pricing-badge premium">Premium</div>
              <div className="pricing-icon">🚀</div>
              <h3 className="pricing-title">Pro</h3>
              <div className="pricing-price"><span className="price-amount">$20</span><span className="price-period">/month</span></div>
              <ul className="pricing-features">
                <li>✅ Unlimited chat messages</li><li>✅ 100 images per month</li><li>✅ 6 games (3 extra Pro)</li>
                <li>✅ Early & quick access to new updates</li><li>✅ Priority support</li><li>✅ Social stories</li>
                <li>✅ 12 months = pay for 11!</li><li>✅ Invoice via email</li>
              </ul>
              <button className="pricing-btn pro-btn" onClick={() => { localStorage.setItem('redirectAfterAuth', '/app/account'); navigate('/signup'); }}>🚀 Upgrade to Pro</button>
            </div>
            <div className="pricing-card enterprise-plan">
              <div className="pricing-badge">For Schools</div>
              <div className="pricing-icon">🏫</div>
              <h3 className="pricing-title">Enterprise</h3>
              <div className="pricing-price"><span className="price-amount">Custom</span><span className="price-period">/pricing</span></div>
              <ul className="pricing-features">
                <li>✅ Everything in Pro</li><li>✅ Multi-user management</li><li>✅ School-wide access</li>
                <li>✅ Teacher dashboard</li><li>✅ Advanced analytics</li><li>✅ Custom branding</li>
                <li>✅ Dedicated support</li><li>✅ Training sessions</li>
              </ul>
              <button className="pricing-btn enterprise-btn" onClick={() => navigate('/enterprise')}>Contact Us</button>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="section-container">
          <h2 className="section-title">📧 Get In Touch</h2>
          <p className="section-subtitle">Have questions? We'd love to hear from you!</p>
          <div className="contact-container">
            <div className="contact-info">
              <h3 className="contact-info-title">Contact Information</h3>
              <div className="contact-item"><span className="contact-icon">🏢</span><div><div className="contact-label">Address</div><div className="contact-value">Sendelightgifts,<br />Unit 22,  <br />Business & Innovation Centre,<br /> Sunderland Enterprise Park,Sunderland – SR5 2TA, UK</div></div></div>
              <div className="contact-item"><span className="contact-icon">📧</span><div><div className="contact-label">Email</div><div className="contact-value">info@sendelightgifts.us</div></div></div>
              <div className="contact-item"><span className="contact-icon">🌍</span><div><div className="contact-label">Availability</div><div className="contact-value">24/7 Support</div></div></div>
              <div className="contact-item"><span className="contact-icon">⚡</span><div><div className="contact-label">Response Time</div><div className="contact-value">Within 24 hours</div></div></div>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-group"><label className="form-label">Your Name</label><input type="text" className="form-input" placeholder="Enter your name" value={contactName} onChange={e => setContactName(e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Email Address</label><input type="email" className="form-input" placeholder="your@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Message</label><textarea className="form-textarea" placeholder="Tell us how we can help..." rows={5} value={contactMessage} onChange={e => setContactMessage(e.target.value)} required /></div>
              <button type="submit" className="form-submit-btn" disabled={contactLoading}>{contactLoading ? 'Sending... ⏳' : 'Send Message 📤'}</button>
              {contactMsg.text && <div className={`form-message ${contactMsg.type}`} style={{ display: 'block' }}>{contactMsg.text}</div>}
            </form>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <span className="hero-highlight">Sendelightgifts   AiBuddy</span>
              <p className="footer-description">A safe and fun learning companion for children, designed with care and powered by AI.</p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Quick Links</h4>
              <a href="#features" className="footer-link" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
              <a href="#pricing" className="footer-link" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
              <a href="#contact" className="footer-link" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a>
              <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setShowTerms(true); }}>Terms & Privacy</a>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Support</h4>
              <a href="#contact" className="footer-link" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Help Center</a>
              <a href="#contact" className="footer-link" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Report an Issue</a>
              <a href="https://sendelightgifts.com/donations/" target="_blank" rel="noopener noreferrer" className="footer-link">💛 Donate</a>
            </div>
          </div>
          <div className="footer-bottom"><p>&copy; 2025 Sendelightgifts   AiBuddy. Made with ❤️ for children everywhere.</p></div>
        </div>
      </footer>

      {showTerms && <TermsModal readOnly onClose={() => setShowTerms(false)} />}
    </div>
  );
};

export default LandingPage;

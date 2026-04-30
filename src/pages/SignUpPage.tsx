import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { externalSupabase } from '@/lib/externalSupabase';
import TermsModal from '@/components/TermsModal';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsPreview, setShowTermsPreview] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    const { data } = await externalSupabase.from('schools').select('id, school_name').order('school_name');
    if (data) setSchools(data);
  };

  const loadTeachers = async (sId: string) => {
    setSchoolId(sId);
    if (!sId || sId === 'personal') { setShowTeacher(false); setTeachers([]); return; }
    const { data } = await externalSupabase.from('teachers').select('id, teacher_name').eq('school_id', sId).order('teacher_name');
    if (data && data.length > 0) { setTeachers(data); setShowTeacher(true); }
    else setShowTeacher(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) { setError('❌ Please fill in all required fields'); return; }
    if (!schoolId) { setError('❌ Please select a school or personal use'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('❌ Please enter a valid email address'); return; }
    if (password.length < 6) { setError('❌ Password must be at least 6 characters long'); return; }
    if (password !== confirmPassword) { setError('❌ Passwords do not match'); return; }
    if (!termsAccepted) { setError('❌ Please accept the Terms of Service & Privacy Policy'); return; }

    setLoading(true);
    const result = await signUp(email, password, name, schoolId || null, teacherId || null);
    setLoading(false);
    if (result.error) { setError(`❌ ${result.error}`); return; }
    const redirectPath = localStorage.getItem('redirectAfterAuth');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterAuth');
      navigate(redirectPath);
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="auth-page" style={{ display: 'block' }}>
      {showTermsPreview && <TermsModal readOnly onClose={() => setShowTermsPreview(false)} />}
      <div className="auth-page-container">
        <div className="auth-page-left">
          <div className="auth-page-branding">
            <h1 className="auth-page-brand-title">Sendelightgifts   AiBuddy</h1>
            <p className="auth-page-brand-subtitle">Start your learning adventure today!</p>
          </div>
          <div className="auth-page-illustration">
            <div className="auth-illustration-character leo">🐱</div>
            <div className="auth-illustration-character milo">🐭</div>
          </div>
        </div>
        <div className="auth-page-right">
          <button className="auth-back-btn" onClick={() => navigate('/')}>← Back to Home</button>
          <div className="auth-form-container">
            <h2 className="auth-form-title">✨ Create Account</h2>
            <p className="auth-form-subtitle">Join thousands of happy learners!</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group-auth">
                <label className="form-label-auth">Full Name</label>
                <input type="text" className="form-input-auth" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">Email Address</label>
                <input type="email" className="form-input-auth" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">Password</label>
                <div className="password-input-container">
                  <input type={showPassword1 ? 'text' : 'password'} className="form-input-auth" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword1(!showPassword1)}>{showPassword1 ? '🙈' : '👁️'}</button>
                </div>
                <small className="input-hint">Must be at least 6 characters</small>
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">Confirm Password</label>
                <div className="password-input-container">
                  <input type={showPassword2 ? 'text' : 'password'} className="form-input-auth" placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword2(!showPassword2)}>{showPassword2 ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">School</label>
                <select className="form-input-auth" value={schoolId} onChange={e => loadTeachers(e.target.value)} required>
                  <option value="">🏫 Select your school</option>
                  <option value="personal">No school affiliation / Personal use</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
                </select>
              </div>
              {showTeacher && (
                <div className="form-group-auth">
                  <label className="form-label-auth">Teacher (Optional)</label>
                  <select className="form-input-auth" value={teacherId} onChange={e => setTeacherId(e.target.value)}>
                    <option value="">👨‍🏫 Select your teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.teacher_name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group-auth">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                    I have read and agree to the{' '}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setShowTermsPreview(true); }}
                      style={{ color: '#4fc3f7', textDecoration: 'underline' }}
                    >
                      Terms of Service & Privacy Policy
                    </a>
                  </span>
                </label>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading || !termsAccepted}>
                <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              </button>
              {error && <p className="auth-error-message" style={{ display: 'block' }}>{error}</p>}
            </form>
            <div className="auth-divider"><span>Already have an account?</span></div>
            <button className="auth-secondary-btn" onClick={() => navigate('/signin')}>Sign In Instead</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;

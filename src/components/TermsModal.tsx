import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TermsModalProps {
  readOnly?: boolean;
  onClose?: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ readOnly = false, onClose }) => {
  const { acceptTerms, logout } = useAuth();
  const [checked, setChecked] = useState(false);

  const handleAccept = useCallback(async () => {
    if (!checked) return;
    await acceptTerms();
  }, [checked, acceptTerms]);

  const handleDecline = useCallback(async () => {
    if (confirm('⚠️ You must accept the Terms of Service to use this app.\n\nIf you decline, you will be logged out.\n\nAre you sure?')) {
      await logout();
    }
  }, [logout]);

  return (
    <div className="auth-modal" style={{ display: 'flex' }}>
      <div className="terms-content">
        <div className="terms-header">
          <h2>📜 Terms of Service & Privacy Policy</h2>
          <p className="terms-subtitle">{readOnly ? 'Read our Terms of Service & Privacy Policy' : 'Please read and accept to continue'}</p>
        </div>
        <div className="terms-body">

          <div className="terms-section">
            <h3>🌟 1. Introduction</h3>
            <ul className="terms-list">
              <li>Welcome to Sendelightgifts   AiBuddy Learning Assistant ("the Service"), operated by Sendelightgifts, Inc.</li>
              <li>By accessing or using this application, you ("the User", "Parent", or "Guardian") agree to be bound by these Terms of Service and Privacy Policy.</li>
              <li>This Service is designed to provide a safe, educational, and supportive environment for children with special needs, including those on the autism spectrum.</li>
              <li>Our mission is to create an inclusive, nurturing digital space where every child can learn, grow, and thrive at their own pace.</li>
              <li>If you do not agree with any part of these terms, you must discontinue use of the Service immediately.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>📖 2. Definitions</h3>
            <ul className="terms-list">
              <li><strong>"Service"</strong> refers to the Sendelightgifts   AiBuddy web application, including all features, content, and tools provided.</li>
              <li><strong>"User"</strong> refers to any individual who accesses or uses the Service, including children, parents, guardians, teachers, and school administrators.</li>
              <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person ('data subject').</li>
              <li><strong>"Processing"</strong> means any operation performed on personal data, whether by automated means or not.</li>
              <li><strong>"Controller"</strong> refers to Sendelightgifts, Inc., which determines the purposes and means of processing personal data.</li>
              <li><strong>"Data Subject"</strong> refers to the individual whose personal data is being processed.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>⚖️ 3. Lawful Basis for Processing (GDPR Article 6)</h3>
            <ul className="terms-list">
              <li><strong>Consent (Art. 6(1)(a)):</strong> By accepting these terms, you provide explicit consent for the processing of personal data as described herein.</li>
              <li><strong>Contract (Art. 6(1)(b)):</strong> Processing is necessary for the performance of the Service contract.</li>
              <li><strong>Legal Obligation (Art. 6(1)(c)):</strong> Processing may be necessary to comply with legal obligations, including child safeguarding laws.</li>
              <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> Processing is necessary for the legitimate interests of child safety and educational improvement.</li>
              <li>For children under the age of 16, parental or guardian consent is required before using the Service, in accordance with GDPR Article 8.</li>
            </ul>
          </div>

          <div className="terms-section highlight-section">
            <h3>📊 4. Data Collection & Processing (GDPR Articles 13 & 14)</h3>
            <p><strong>Important Notice for Parents and Guardians:</strong></p>
            <ul className="terms-list">
              <li><strong>Chat History:</strong> We collect and store all chat conversations between your child and the AI assistant. This data is processed for improving response quality and detecting concerning interactions. Legal basis: Consent and Legitimate Interest.</li>
              <li><strong>Usage Data:</strong> We track learning activities, interaction patterns, time spent on activities, and feature usage to optimise the learning experience. Legal basis: Contract Performance and Legitimate Interest.</li>
              <li><strong>Generated Content:</strong> All AI-generated images and videos created during sessions are stored securely for parental review. Legal basis: Consent.</li>
              <li><strong>Safety Alerts:</strong> Our system monitors conversations for concerning patterns. If detected, immediate notifications are sent to parents, assigned teachers, school principals, and counsellors. Legal basis: Legitimate Interest and Legal Obligation (child safeguarding).</li>
              <li><strong>Progress Data:</strong> Learning progress, level achievements, game scores, and activity completion rates are tracked to provide insights into your child's development. Legal basis: Contract Performance.</li>
              <li><strong>Technical Data:</strong> IP addresses, browser type, device information, and access timestamps are collected for security and service improvement. Legal basis: Legitimate Interest.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🔒 5. Data Security (GDPR Article 32)</h3>
            <ul className="terms-list">
              <li>All personal information is encrypted at rest and in transit using industry-standard encryption protocols (AES-256 and TLS 1.3).</li>
              <li>We implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.</li>
              <li>Access to personal data is restricted to authorised personnel only, who are bound by confidentiality obligations.</li>
              <li>We use secure, encrypted connections (HTTPS/TLS) for all data transmission.</li>
              <li>Regular security audits and penetration testing are conducted to maintain the highest level of data protection.</li>
              <li>We maintain a data breach notification procedure in compliance with GDPR Articles 33 and 34.</li>
              <li>In the event of a personal data breach, we shall notify the relevant supervisory authority within 72 hours and affected data subjects without undue delay where the breach is likely to result in high risk.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🌍 6. International Data Transfers (GDPR Chapter V)</h3>
            <ul className="terms-list">
              <li>Your data may be transferred to and processed in countries outside the European Economic Area (EEA) or the United Kingdom.</li>
              <li>Where such transfers occur, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission.</li>
              <li>We ensure that any third-party processors in non-adequate countries provide sufficient guarantees of GDPR-compliant data protection.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>👤 7. Data Subject Rights (GDPR Articles 15–22)</h3>
            <p>Under GDPR and the UK Data Protection Act 2018, you have the following rights:</p>
            <ul className="terms-list">
              <li><strong>Right of Access (Art. 15):</strong> You have the right to obtain confirmation of whether personal data is being processed and access to that data.</li>
              <li><strong>Right to Rectification (Art. 16):</strong> You have the right to request correction of inaccurate personal data.</li>
              <li><strong>Right to Erasure (Art. 17):</strong> You have the right to request deletion of personal data ("right to be forgotten") where there is no compelling reason for its continued processing.</li>
              <li><strong>Right to Restriction (Art. 18):</strong> You have the right to request restriction of processing in certain circumstances.</li>
              <li><strong>Right to Data Portability (Art. 20):</strong> You have the right to receive personal data in a structured, commonly used, machine-readable format.</li>
              <li><strong>Right to Object (Art. 21):</strong> You have the right to object to processing based on legitimate interests or direct marketing.</li>
              <li><strong>Rights related to Automated Decision-Making (Art. 22):</strong> You have the right not to be subject to decisions based solely on automated processing which produce legal effects.</li>
              <li>To exercise any of these rights, contact us at info@sendelightgifts.us. We will respond within one month as required by GDPR Article 12.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>👨‍👩‍👧‍👦 8. Parental Controls & Oversight</h3>
            <ul className="terms-list">
              <li>Parents/guardians can review all chat history and generated content at any time through the admin dashboard or by contacting us.</li>
              <li>Safety alert notifications are sent directly to parents via email when concerning interactions are detected.</li>
              <li>Parents can request account deletion, data export, or content review at any time.</li>
              <li>School administrators and assigned teachers may also receive safety alerts if a school is selected during registration.</li>
              <li>Parental consent must be obtained before a child under 16 can use the Service.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🏫 9. School & Teacher Integration</h3>
            <ul className="terms-list">
              <li>If a school and teacher are selected during registration, relevant safety alerts may be shared with school staff.</li>
              <li>School administrators can access aggregated, anonymised usage data for their institution.</li>
              <li>Teachers assigned to students may receive safety notifications to ensure comprehensive child protection.</li>
              <li>School data is kept separate and secure from other institutions.</li>
              <li>Data sharing with schools is governed by a Data Processing Agreement as required under GDPR Article 28.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🎯 10. Acceptable Use</h3>
            <ul className="terms-list">
              <li>This service is intended for educational and therapeutic purposes only.</li>
              <li>Users must not attempt to generate inappropriate, violent, or adult content.</li>
              <li>Parental supervision is recommended, especially for younger children.</li>
              <li>Users should not share personal information such as home addresses, phone numbers, or school locations with the AI assistant.</li>
              <li>The service should not be used to replace professional medical, psychological, or educational advice.</li>
              <li>Any misuse of the Service may result in account suspension or termination.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🤖 11. AI Assistant Disclaimer</h3>
            <ul className="terms-list">
              <li>The AI assistant is a tool designed to support learning and development. It is not a replacement for human interaction, professional therapy, or medical advice.</li>
              <li>While we strive for accuracy, AI-generated content may occasionally contain errors or inaccuracies.</li>
              <li>The AI is programmed to provide child-safe, age-appropriate responses. However, no AI system is perfect, and parental oversight is encouraged.</li>
              <li>Generated images and videos are created by AI and may not always perfectly represent the requested content.</li>
              <li>The service is not a substitute for professional medical, therapeutic, or educational assessment.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🍪 12. Cookies & Tracking Technologies</h3>
            <ul className="terms-list">
              <li>We use essential cookies necessary for the operation of the Service (e.g., session management, authentication).</li>
              <li>We do not use third-party advertising cookies or tracking pixels.</li>
              <li>Analytics cookies may be used to understand usage patterns and improve the Service. These are anonymised where possible.</li>
              <li>You can manage cookie preferences through your browser settings. Disabling essential cookies may affect Service functionality.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>📦 13. Data Retention (GDPR Article 5(1)(e))</h3>
            <ul className="terms-list">
              <li>Personal data is retained only for as long as necessary to fulfil the purposes for which it was collected.</li>
              <li>Chat history and generated content are retained for the duration of the active account plus 12 months after account deletion.</li>
              <li>Safety alert records are retained for a minimum of 3 years in compliance with child safeguarding requirements.</li>
              <li>Upon request, data will be deleted within 30 days, except where retention is required by law.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>💳 14. Subscription & Payment</h3>
            <ul className="terms-list">
              <li>Free tier users have access to limited daily messages and image generations.</li>
              <li>Premium features and unlimited access are available through paid subscriptions.</li>
              <li>Subscription terms and pricing may change with 30 days' advance notice to users.</li>
              <li>Refund policies apply as per our billing provider's terms.</li>
              <li>Payment data is processed by third-party payment processors and is not stored on our servers.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🛡️ 15. Third-Party Processors (GDPR Article 28)</h3>
            <ul className="terms-list">
              <li>We engage third-party processors to provide certain aspects of the Service (e.g., cloud hosting, AI processing, email delivery).</li>
              <li>All third-party processors are bound by Data Processing Agreements that comply with GDPR requirements.</li>
              <li>We conduct due diligence on all processors to ensure adequate data protection standards.</li>
              <li>A list of sub-processors is available upon request.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>⚖️ 16. Limitation of Liability</h3>
            <ul className="terms-list">
              <li>Sendelightgifts   AiBuddy is provided "as is" without warranties of any kind, express or implied.</li>
              <li>We are not liable for any indirect, incidental, special, or consequential damages arising from the use of this Service.</li>
              <li>Our total liability shall not exceed the amount paid by you for the Service in the 12 months preceding the claim.</li>
              <li>We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.</li>
              <li>Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>📝 17. Changes to These Terms</h3>
            <ul className="terms-list">
              <li>We reserve the right to update these terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before they take effect.</li>
              <li>Continued use of the Service after changes take effect constitutes acceptance of the updated terms.</li>
              <li>If you do not agree with the updated terms, you must stop using the Service and may request account deletion.</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>🏛️ 18. Governing Law & Jurisdiction</h3>
            <ul className="terms-list">
              <li>These terms are governed by and construed in accordance with the laws of the United States of America and, where applicable, the General Data Protection Regulation (EU) 2016/679 and the UK Data Protection Act 2018.</li>
              <li>Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of the State of New York.</li>
              <li>EU/UK data subjects have the right to lodge a complaint with their local supervisory authority (e.g., the ICO in the UK).</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>📧 19. Contact Us & Data Protection Officer</h3>
            <ul className="terms-list">
              <li><strong>Data Controller:</strong> Sendelightgifts, Inc.</li>
              <li><strong>Address:</strong> Unit 22, Business & Innovation Centre, Sunderland Enterprise Park, Sunderland – SR5 2TA, UK</li>
              <li><strong>Email:</strong> info@sendelightgifts.us</li>
              <li><strong>Website:</strong> Sendelightgifts.com</li>
              <li><strong>Response Time:</strong> We aim to respond to all data subject requests within one month as required by GDPR.</li>
              <li>For data protection enquiries or to exercise your rights, contact us using the details above.</li>
            </ul>
          </div>

          <div className="terms-footer">
            <p><strong>Last Updated:</strong> December 24, 2025</p>
            <p>By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by this Terms of Service and Privacy Policy in compliance with GDPR (EU) 2016/679, UK Data Protection Act 2018, and applicable US privacy laws.</p>
          </div>

          {readOnly && (
            <div className="terms-actions" style={{ borderTop: 'none', marginTop: '20px' }}>
              <button className="auth-btn exit-btn" onClick={onClose} style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', color: 'white', fontWeight: 'bold' }}>
                🚪 Exit
              </button>
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="terms-actions">
            <label className="terms-checkbox-wrapper">
              <input type="checkbox" className="terms-checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
              <span className="terms-checkbox-text">I have read and accept the Terms of Service & Privacy Policy</span>
            </label>
            <button className="auth-btn accept-btn" disabled={!checked} onClick={handleAccept}>✅ I Accept & Continue</button>
            <button className="auth-btn decline-btn" onClick={handleDecline}>❌ Decline & Logout</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TermsModal;

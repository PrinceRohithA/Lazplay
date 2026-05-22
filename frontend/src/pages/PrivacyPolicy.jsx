import React, { useEffect } from 'react';
import LegalLayout from '../components/LegalLayout';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "PRIVACY POLICY | LAZPLAY";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Learn about how Lazplay collects, uses, and protects your data in our Privacy Policy.");
  }, []);

  return (
    <LegalLayout title="PRIVACY_POLICY" lastUpdated="MAY_20_2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          Lazplay values user privacy and is committed to protecting personal information.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, and safeguard user data.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p>We may collect:</p>
        <ul>
          <li>Email address</li>
          <li>Username and profile information</li>
          <li>Login and authentication data</li>
          <li>Device and browser information</li>
          <li>IP addresses</li>
          <li>Platform usage information</li>
          <li>Crash and diagnostic logs</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <p>Collected information may be used for:</p>
        <ul>
          <li>Account authentication</li>
          <li>Platform functionality</li>
          <li>Content delivery</li>
          <li>Security and fraud prevention</li>
          <li>Performance monitoring</li>
          <li>Customer support</li>
          <li>Service improvements</li>
        </ul>
      </section>

      <section>
        <h2>4. Third-Party Services</h2>
        <p>Lazplay may use trusted third-party providers for:</p>
        <ul>
          <li>Content delivery</li>
          <li>Cloud hosting</li>
          <li>Analytics</li>
          <li>Payment processing</li>
          <li>Security services</li>
        </ul>
        <p>
          These providers may process limited technical information necessary to operate their services.
        </p>
      </section>

      <section>
        <h2>5. Cookies and Local Storage</h2>
        <p>We may use cookies and local storage to:</p>
        <ul>
          <li>Maintain sessions</li>
          <li>Store preferences</li>
          <li>Improve user experience</li>
          <li>Support authentication</li>
        </ul>
        <p>
          Users may disable cookies through browser settings, though some platform features may become unavailable.
        </p>
      </section>

      <section>
        <h2>6. Data Security</h2>
        <p>
          We implement reasonable technical and administrative safeguards to protect user information.
        </p>
        <p>
          However, no online platform can guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>Information may be retained:</p>
        <ul>
          <li>While accounts remain active</li>
          <li>For legal compliance</li>
          <li>For security and fraud prevention purposes</li>
          <li>To maintain platform operations</li>
        </ul>
      </section>

      <section>
        <h2>8. User Rights</h2>
        <p>Users may request:</p>
        <ul>
          <li>Access to personal data</li>
          <li>Correction of inaccurate information</li>
          <li>Account deletion requests</li>
        </ul>
        <p>
          Requests may be submitted through our support channels.
        </p>
      </section>

      <section>
        <h2>9. Policy Updates</h2>
        <p>
          This Privacy Policy may be updated periodically.
        </p>
        <p>
          Continued use of Lazplay after updates constitutes acceptance of the revised policy.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>For privacy-related inquiries:</p>
        <p><strong>privacy@lazplay.com</strong></p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicy;

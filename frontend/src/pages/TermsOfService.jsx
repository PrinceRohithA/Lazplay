import React, { useEffect } from 'react';
import LegalLayout from '../components/LegalLayout';

const TermsOfService = () => {
  useEffect(() => {
    document.title = "TERMS AND CONDITIONS | LAZPLAY";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Review the Terms and Conditions for Lazplay, the indie game distribution platform.");
  }, []);

  return (
    <LegalLayout title="TERMS_AND_CONDITIONS" lastUpdated="MAY_20_2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          Welcome to <strong>Lazplay</strong>. These Terms and Conditions govern your access to and use of the Lazplay platform, website, launcher applications, and related services.
        </p>
        <p>
          By accessing or using Lazplay, you agree to comply with these Terms. If you do not agree, you must discontinue use of the platform immediately.
        </p>
        <p>
          Lazplay is a digital entertainment and game distribution platform that allows users to discover, download, and access digital games and interactive software created by independent developers.
        </p>
      </section>

      <section>
        <h2>2. Platform Services</h2>
        <p>
          Lazplay provides infrastructure and services for the hosting, discovery, distribution, and delivery of digital entertainment content.
        </p>
        <p>We may offer:</p>
        <ul>
          <li>Digital game downloads</li>
          <li>Launcher applications</li>
          <li>User accounts and libraries</li>
          <li>Community and discovery features</li>
          <li>Developer publishing tools</li>
        </ul>
        <p>
          Lazplay does not guarantee uninterrupted availability of the platform or any uploaded content.
        </p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <p>
          Users may be required to create an account to access certain features.
        </p>
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate registration information</li>
          <li>Maintain the confidentiality of your account credentials</li>
          <li>Accept responsibility for activity occurring under your account</li>
          <li>Notify us immediately of unauthorized access or security issues</li>
        </ul>
        <p>
          Lazplay reserves the right to suspend or terminate accounts that violate these Terms.
        </p>
      </section>

      <section>
        <h2>4. Developer Content</h2>
        <p>
          Developers are solely responsible for the games, software, media, and content they upload to Lazplay.
        </p>
        <p>Developers must:</p>
        <ul>
          <li>Own or possess rights to uploaded content</li>
          <li>Ensure content complies with applicable laws</li>
          <li>Avoid uploading malicious, harmful, or infringing material</li>
          <li>Accurately describe their products and services</li>
        </ul>
        <p>
          Lazplay may remove content that violates these Terms or presents security or legal concerns.
        </p>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>Users may not:</p>
        <ul>
          <li>Upload malicious software or harmful code</li>
          <li>Attempt unauthorized access to systems or accounts</li>
          <li>Distribute pirated or infringing material</li>
          <li>Harass other users or developers</li>
          <li>Disrupt platform operations</li>
          <li>Use the platform for unlawful activities</li>
        </ul>
        <p>
          Violation of these rules may result in account suspension or permanent removal.
        </p>
      </section>

      <section>
        <h2>6. Payments and Digital Purchases</h2>
        <p>
          Lazplay may provide paid digital content and services.
        </p>
        <p>
          Payments are processed through third-party payment providers. Lazplay does not directly store full payment card information.
        </p>
        <p>
          Prices, offers, and availability may change without prior notice.
        </p>
        <p>
          All purchases are subject to our Refund Policy.
        </p>
      </section>

      <section>
        <h2>7. No Gambling or Real-Money Services</h2>
        <p>
          Lazplay is a digital entertainment platform only.
        </p>
        <p>The platform does not provide:</p>
        <ul>
          <li>Gambling services</li>
          <li>Betting or wagering systems</li>
          <li>Cash-withdrawable rewards</li>
          <li>Real-money gaming services</li>
        </ul>
        <p>
          Users cannot withdraw money, convert platform activity into cash, or exchange platform features for real-world monetary value.
        </p>
      </section>

      <section>
        <h2>8. Intellectual Property</h2>
        <p>
          All trademarks, branding, platform assets, and original Lazplay materials are protected under applicable intellectual property laws.
        </p>
        <p>
          Developers retain ownership of their uploaded content.
        </p>
        <p>
          By uploading content, developers grant Lazplay a non-exclusive license to host, distribute, and display content for platform operations.
        </p>
      </section>

      <section>
        <h2>9. Privacy</h2>
        <p>
          Our collection and use of personal data is governed by the Lazplay Privacy Policy.
        </p>
        <p>
          By using Lazplay, you consent to the processing of information as described in the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Lazplay and its operators shall not be liable for indirect, incidental, special, or consequential damages arising from:
        </p>
        <ul>
          <li>Use of the platform</li>
          <li>Downloaded software</li>
          <li>Platform interruptions</li>
          <li>User-generated content</li>
          <li>Third-party integrations</li>
        </ul>
        <p>
          Users access and use the platform at their own discretion and risk.
        </p>
      </section>

      <section>
        <h2>11. Suspension and Termination</h2>
        <p>Lazplay reserves the right to:</p>
        <ul>
          <li>Remove content</li>
          <li>Restrict access</li>
          <li>Suspend accounts</li>
          <li>Terminate services</li>
        </ul>
        <p>
          for violations of these Terms, security concerns, abuse, or legal compliance requirements.
        </p>
      </section>

      <section>
        <h2>12. Changes to Terms</h2>
        <p>
          We may update these Terms periodically.
        </p>
        <p>
          Continued use of Lazplay after updates constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>13. Governing Law</h2>
        <p>
          These Terms shall be governed by the laws of India.
        </p>
        <p>
          Any disputes arising from these Terms shall be subject to the jurisdiction of the courts of India.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>For support or legal inquiries, contact:</p>
        <p><strong>support@lazplay.com</strong></p>
      </section>
    </LegalLayout>
  );
};

export default TermsOfService;

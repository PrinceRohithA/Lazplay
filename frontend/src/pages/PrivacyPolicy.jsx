import React, { useEffect } from 'react';
import LegalLayout from '../components/LegalLayout';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "PRIVACY POLICY | LAZPLAY";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Learn about how Lazplay collects, uses, and protects your data in our Privacy Policy.");
  }, []);

  return (
    <LegalLayout title="PRIVACY_POLICY" lastUpdated="MAY_19_2026">
      <section>
        <h2>1. DATA_COLLECTION_OVERVIEW</h2>
        <p>
          At <strong>Lazplay</strong>, we prioritize the security and privacy of our users. This policy outlines what data we collect, why we collect it, and how we protect it.
        </p>
      </section>

      <section>
        <h2>2. INFORMATION_WE_COLLECT</h2>
        <h3>A. ACCOUNT_DATA</h3>
        <p>
          When you create an account, we collect:
        </p>
        <ul>
          <li>Email address</li>
          <li>Username and display name</li>
          <li>Profile information (avatar, bio)</li>
          <li>Hashed password credentials</li>
        </ul>

        <h3>B. LAUNCHER_TELEMETRY</h3>
        <p>
          To ensure game compatibility and platform stability, our desktop and mobile launchers may collect:
        </p>
        <ul>
          <li>Operating system version</li>
          <li>Hardware specifications (CPU, GPU, RAM)</li>
          <li>Game execution logs (for crash reporting)</li>
          <li>Download and installation progress</li>
          <li>Game playtime and achievement data</li>
        </ul>

        <h3>C. TECHNICAL_LOGS</h3>
        <p>
          For security and anti-abuse purposes, we log:
        </p>
        <ul>
          <li>IP addresses</li>
          <li>Browser user-agent strings</li>
          <li>Access timestamps</li>
          <li>API request metadata</li>
        </ul>
      </section>

      <section>
        <h2>3. HOW_WE_USE_YOUR_DATA</h2>
        <p>
          We use the collected information for:
        </p>
        <ul>
          <li><strong>Authentication:</strong> Managing your secure access to the platform.</li>
          <li><strong>Distribution:</strong> Delivering game chunks and updates via Cloudflare R2.</li>
          <li><strong>Personalization:</strong> Displaying your library, progress, and cosmetics.</li>
          <li><strong>Analytics:</strong> Understanding platform usage to improve performance.</li>
          <li><strong>Security:</strong> Detecting and preventing fraudulent activity, piracy, or abuse.</li>
        </ul>
      </section>

      <section>
        <h2>4. THIRD_PARTY_SERVICES</h2>
        <p>
          We integrate with several industry-standard services to provide our platform:
        </p>
        <ul>
          <li><strong>Cloudflare:</strong> We use Cloudflare for CDN services, DDoS protection, and R2 storage. They may process your IP address and technical headers to optimize delivery.</li>
          <li><strong>Razorpay:</strong> All payment processing is handled securely by Razorpay. Lazplay does not store your credit card or full banking details on our servers.</li>
          <li><strong>Catalyst/Hosting:</strong> Our backend infrastructure may be hosted on cloud providers (e.g., AWS, Zoho Catalyst) which maintain their own rigorous security standards.</li>
        </ul>
      </section>

      <section>
        <h2>5. COOKIES_AND_SESSION_STORAGE</h2>
        <p>
          Lazplay uses cookies and local storage to maintain your session, remember your preferences (such as "Remember Me" functionality), and keep you logged in across different parts of the platform. You can manage cookie settings through your browser, but some features may become unavailable if cookies are disabled.
        </p>
      </section>

      <section>
        <h2>6. DATA_RETENTION_AND_SECURITY</h2>
        <p>
          We implement administrative and technical security measures to protect your data. We retain your information for as long as your account is active or as needed to provide you with services and comply with legal obligations.
        </p>
      </section>

      <section>
        <h2>7. YOUR_RIGHTS_AND_DATA_REMOVAL</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li><strong>Request Account Deletion:</strong> You may request the permanent removal of your account and associated personal data by contacting our support team or using the deletion tools in your profile settings.</li>
        </ul>
        <p>
          Please note that some data may be retained for legal, audit, or anti-fraud purposes even after account deletion.
        </p>
      </section>

      <section>
        <h2>8. UPDATES_TO_THIS_POLICY</h2>
        <p>
          We may update this Privacy Policy from time to time. Significant changes will be communicated via the platform or email. Continued use of the platform after updates constitutes acceptance of the revised policy.
        </p>
      </section>

      <section>
        <h2>9. CONTACT_INFORMATION</h2>
        <p>
          For any privacy-related inquiries, please reach out to our Data Protection team at <strong>privacy@lazplay.com</strong>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicy;

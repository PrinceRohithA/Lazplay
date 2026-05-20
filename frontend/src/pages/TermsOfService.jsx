import React, { useEffect } from 'react';
import LegalLayout from '../components/LegalLayout';

const TermsOfService = () => {
  useEffect(() => {
    document.title = "TERMS AND CONDITIONS | LAZPLAY";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Review the Terms and Conditions for Lazplay, the indie game distribution platform.");
  }, []);

  return (
    <LegalLayout title="TERMS_AND_CONDITIONS" lastUpdated="MAY_19_2026">
      <section>
        <h2>1. AGREEMENT_TO_TERMS</h2>
        <p>
          Welcome to <strong>Lazplay</strong>. By accessing our platform, website, or using our launcher systems, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must immediately terminate your use of our services.
        </p>
        <p>
          Lazplay is an indie game distribution platform providing services for web, Windows, Android, and Linux games. We facilitate the distribution, discovery, and purchase of digital content created by independent developers.
        </p>
      </section>

      <section>
        <h2>2. PLATFORM_ROLE_AND_LIABILITY</h2>
        <p>
          <strong>Lazplay is a distribution platform.</strong> We provide the infrastructure for independent developers to host and distribute their software. 
        </p>
        <ul>
          <li><strong>Developer Responsibility:</strong> All games, software, and content uploaded to Lazplay are the sole responsibility of the respective developers who uploaded them.</li>
          <li><strong>No Guarantee of Safety:</strong> While we implement automated security measures, Lazplay does not and cannot guarantee that all uploaded software is free from bugs, malware, or security vulnerabilities.</li>
          <li><strong>Assumption of Risk:</strong> You acknowledge that downloading and executing software from independent developers involves inherent risks. You use the platform and its hosted content at your own discretion and risk.</li>
        </ul>
      </section>

      <section>
        <h2>3. USER_RESPONSIBILITIES</h2>
        <p>
          As a user of Lazplay, you agree to:
        </p>
        <ul>
          <li>Provide accurate information during account registration.</li>
          <li>Maintain the security of your account credentials.</li>
          <li>Use the platform only for lawful purposes.</li>
          <li>Refrain from attempting to bypass any platform security, DRM, or access controls.</li>
          <li>Not engage in any activity that interferes with or disrupts the platform services.</li>
        </ul>
      </section>

      <section>
        <h2>4. DEVELOPER_RESPONSIBILITIES_AND_CONTENT</h2>
        <p>
          Developers uploading content to Lazplay must:
        </p>
        <ul>
          <li>Own or have the necessary licenses for all content uploaded.</li>
          <li>Ensure content does not contain malware, spyware, or malicious code.</li>
          <li>Comply with all applicable laws and intellectual property rights.</li>
          <li>Accurately represent their games and software in descriptions and metadata.</li>
        </ul>
        <p>
          <strong>Ownership:</strong> Developers retain ownership of their uploaded content. By uploading to Lazplay, developers grant us a non-exclusive, worldwide, royalty-free license to host, distribute, and display the content for platform operations.
        </p>
      </section>

      <section>
        <h2>5. PROHIBITED_UPLOADS_AND_CONDUCT</h2>
        <p>
          The following are strictly prohibited on Lazplay:
        </p>
        <ul>
          <li><strong>Piracy:</strong> Uploading or distributing cracked software or content you do not own.</li>
          <li><strong>Malware:</strong> Any software intended to damage, disrupt, or gain unauthorized access to systems.</li>
          <li><strong>Hate Speech & Illegal Content:</strong> Content that violates Indian laws or international human rights standards.</li>
          <li><strong>Abuse:</strong> Harassment of other users or developers via comments or social features.</li>
        </ul>
      </section>

      <section>
        <h2>6. PAYMENTS_AND_COMMERCE</h2>
        <p>
          Lazplay supports digital purchases, including games and cosmetics.
        </p>
        <ul>
          <li>Transactions are processed via third-party providers (e.g., Razorpay).</li>
          <li>Pricing is determined by the developers or the platform.</li>
          <li>You are responsible for any taxes associated with your purchases.</li>
          <li>Refer to our <strong>Refund Policy</strong> for details on digital goods returns.</li>
        </ul>
      </section>

      <section>
        <h2>7. NO_GAMBLING_OR_WITHDRAWAL_POLICY</h2>
        <p>
          <strong>Lazplay is strictly a game distribution and entertainment platform.</strong>
        </p>
        <ul>
          <li><strong>Not a Gambling Platform:</strong> This platform is not a gambling, betting, or wagering service. We do not host games that involve real-money gambling.</li>
          <li><strong>No Monetary Winnings:</strong> There are no systems within Lazplay that allow users to win real money, cash prizes, or any form of currency that can be exchanged for real money.</li>
          <li><strong>No Withdrawals:</strong> Lazplay does not support the withdrawal of funds. Payments made on the platform are solely for the purchase of digital games and content for personal entertainment.</li>
          <li><strong>Entertainment Only:</strong> All virtual items, cosmetics, or platform-specific credits have no real-world monetary value and cannot be "cashed out" or transferred for value outside the platform.</li>
        </ul>
      </section>

      <section>
        <h2>8. LAUNCHER_AND_SYSTEM_USAGE</h2>
        <p>
          The Lazplay Desktop and Android launchers are provided "as-is". They may collect telemetry and system information required for game execution and platform functionality as detailed in our <strong>Privacy Policy</strong>.
        </p>
      </section>

      <section>
        <h2>8. MODERATION_AND_TERMINATION</h2>
        <p>
          Lazplay reserves the right to:
        </p>
        <ul>
          <li>Remove any content that violates these terms.</li>
          <li>Suspend or terminate accounts for fraudulent activity, abuse, or repeated violations.</li>
          <li>Modify platform features or availability at any time without prior notice.</li>
        </ul>
      </section>

      <section>
        <h2>9. INTELLECTUAL_PROPERTY_AND_DMCA</h2>
        <p>
          If you believe your intellectual property has been infringed upon by content on our platform, please contact our legal team with a formal takedown request including proof of ownership and specific identification of the infringing material.
        </p>
      </section>

      <section>
        <h2>10. LIMITATION_OF_LIABILITY</h2>
        <p>
          To the maximum extent permitted by law, Lazplay (including its operators and affiliates) shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the platform or any software downloaded through it.
        </p>
      </section>

      <section>
        <h2>11. GOVERNING_LAW</h2>
        <p>
          These terms are governed by the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts located in India.
        </p>
      </section>
    </LegalLayout>
  );
};

export default TermsOfService;

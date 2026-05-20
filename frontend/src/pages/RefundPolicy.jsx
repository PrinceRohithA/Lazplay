import React, { useEffect } from 'react';
import LegalLayout from '../components/LegalLayout';

const RefundPolicy = () => {
  useEffect(() => {
    document.title = "REFUND POLICY | LAZPLAY";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Understand our refund criteria for digital games on the Lazplay platform.");
  }, []);

  return (
    <LegalLayout title="REFUND_POLICY" lastUpdated="MAY_20_2026">
      <section>
        <h2>1. DIGITAL_GOODS_NATURE</h2>
        <p>
          At <strong>Lazplay</strong>, we primarily distribute digital goods, including video games and software. Due to the nature of digital content which can be consumed or downloaded immediately upon purchase, our refund policy is designed to be fair to both players and independent developers.
        </p>
      </section>

      <section>
        <h2>2. ELIGIBILITY_CRITERIA</h2>
        <p>
          You may be eligible for a refund for a digital game purchase if you meet the following requirements:
        </p>
        <ul>
          <li><strong>Request Window:</strong> The refund request is submitted within <strong>14 days</strong> of purchase.</li>
          <li><strong>Playtime/Usage:</strong> The game has been played for less than <strong>2 hours</strong> (total combined playtime across all sessions).</li>
          <li><strong>Download Status:</strong> For large assets or specific software, significant portions of the content must not have been downloaded.</li>
        </ul>
      </section>

      <section>
        <h2>3. ACCIDENTAL_AND_DUPLICATE_PURCHASES</h2>
        <p>
          We understand that mistakes happen. If you accidentally purchased the same content twice or made a purchase in error:
        </p>
        <ul>
          <li>Contact support immediately (within 24 hours).</li>
          <li>Do not download or launch the accidentally purchased content.</li>
          <li>We will review technical logs to verify the duplicate transaction and process a refund to your original payment method.</li>
        </ul>
      </section>

      <section>
        <h2>4. DEVELOPER_PAYOUT_CONSIDERATIONS</h2>
        <p>
          Lazplay is a community-driven platform. When you purchase a game, a significant portion of the funds is allocated to the developer. 
        </p>
        <ul>
          <li>Refunds may be delayed if the developer's payout cycle has already been initiated.</li>
          <li>In cases where a developer has already been paid, Lazplay may issue the refund as platform credit (LazCredits) instead of a direct reversal to the original payment method.</li>
        </ul>
      </section>

      <section>
        <h2>5. ABUSE_PREVENTION</h2>
        <p>
          To protect our developers and the platform from exploitation:
        </p>
        <ul>
          <li><strong>Manual Review:</strong> All refund requests are subject to manual review by the Lazplay Moderation Team.</li>
          <li><strong>Refund Limits:</strong> Users who exhibit a pattern of excessive refunding (e.g., "serial refunding" to play games for free) may have their refund privileges suspended.</li>
          <li><strong>Fraudulent Activity:</strong> Any attempt to use stolen cards or engage in chargeback fraud will result in permanent account suspension and reporting to relevant financial authorities.</li>
        </ul>
      </section>

      <section>
        <h2>6. HOW_TO_REQUEST_A_REFUND</h2>
        <p>
          To initiate a refund request:
        </p>
        <ol>
          <li>Email <strong>support@lazplay.com</strong> with your Transaction ID, Username, and reason for the request.</li>
          <li>Alternatively, you can contact us via our official social channels or support Discord if available.</li>
          <li>We will review technical logs to verify the transaction and process the refund to your original payment method if eligible.</li>
        </ol>
      </section>

      <section>
        <h2>7. PROCESSING_TIME</h2>
        <p>
          Once a refund is approved, it may take <strong>5-10 business days</strong> for the funds to appear in your bank account or on your credit card statement, depending on your financial institution and the payment processor (e.g., Razorpay).
        </p>
      </section>

      <section>
        <h2>8. DISCRETIONARY_REFUNDS</h2>
        <p>
          Lazplay reserves the right to issue refunds at its sole discretion, even if the above criteria are not met, in exceptional circumstances such as severe technical failures of a game that prevent it from running on supported hardware.
        </p>
      </section>
    </LegalLayout>
  );
};

export default RefundPolicy;

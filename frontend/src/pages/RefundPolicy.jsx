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
        <h2>1. Digital Products</h2>
        <p>
          Lazplay primarily distributes digital products including games and software.
        </p>
        <p>
          Due to the nature of digital goods, refunds are subject to eligibility requirements.
        </p>
      </section>

      <section>
        <h2>2. Refund Eligibility</h2>
        <p>Refund requests may be considered if:</p>
        <ul>
          <li>The request is submitted within 14 days of purchase</li>
          <li>The product has minimal usage or playtime</li>
          <li>The purchase was accidental or duplicated</li>
          <li>Technical issues prevent reasonable use of the product</li>
        </ul>
        <p>
          Refund approval is subject to review.
        </p>
      </section>

      <section>
        <h2>3. Non-Refundable Situations</h2>
        <p>Refunds may not be provided for:</p>
        <ul>
          <li>Extensive product usage</li>
          <li>Abuse of refund systems</li>
          <li>Violations of platform policies</li>
          <li>Fraudulent transactions</li>
        </ul>
      </section>

      <section>
        <h2>4. Refund Process</h2>
        <p>To request a refund, users may contact:</p>
        <p><strong>support@lazplay.com</strong></p>
        <p>Please include:</p>
        <ul>
          <li>Transaction details</li>
          <li>Account information</li>
          <li>Reason for the request</li>
        </ul>
      </section>

      <section>
        <h2>5. Processing Time</h2>
        <p>
          Approved refunds may require several business days to process depending on the payment provider and financial institution.
        </p>
      </section>

      <section>
        <h2>6. Fraud Prevention</h2>
        <p>Lazplay reserves the right to:</p>
        <ul>
          <li>Investigate suspicious activity</li>
          <li>Limit refund abuse</li>
          <li>Suspend fraudulent accounts</li>
        </ul>
      </section>

      <section>
        <h2>7. Policy Updates</h2>
        <p>
          This policy may be updated periodically.
        </p>
        <p>
          Continued use of Lazplay after updates constitutes acceptance of the revised policy.
        </p>
      </section>
    </LegalLayout>
  );
};

export default RefundPolicy;

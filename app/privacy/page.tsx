export const metadata = {
  title: 'Privacy Policy - VelocityApps',
  description: 'Privacy Policy for VelocityApps - Shopify Automation Platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: January 27, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              VelocityApps ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-[#32cd32] mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><strong>Account Information:</strong> Email address, password (encrypted), name</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card details)</li>
              <li><strong>Shopify Store Information:</strong> Store URL, access tokens (encrypted)</li>
              <li><strong>Pinterest (Pinterest Stock Sync automation):</strong> If you use this automation, you may provide your Pinterest access token so we can create Pins on your chosen board for out-of-stock products. The token is stored in your automation configuration and used only to create/update Pins as you have configured.</li>
              <li><strong>Automation Configuration:</strong> Settings and preferences for your automations</li>
              <li><strong>Support Communications:</strong> Messages sent through our support system</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-[#32cd32] mt-6">2.2 Information Automatically Collected</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Cookies:</strong> Session cookies, authentication tokens</li>
              <li><strong>Log Data:</strong> Error logs, performance metrics</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-[#32cd32] mt-6">2.3 Information from Shopify</h3>
            <p className="text-gray-300 leading-relaxed">
              When you connect your Shopify store, we access:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Product information (for inventory automations)</li>
              <li>Order data (for review requests, abandoned carts)</li>
              <li>Customer information (for email automations)</li>
              <li>Inventory levels (for stock alerts)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              This data is accessed only as necessary to provide the automation services you've installed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use the collected information for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Providing and maintaining the Service</li>
              <li>Processing payments and managing subscriptions</li>
              <li>Executing automations you've installed</li>
              <li>Sending you service-related notifications</li>
              <li>Responding to your support requests</li>
              <li>Improving and optimizing the Service</li>
              <li>Detecting and preventing fraud or abuse</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-[#32cd32] mt-6">4.1 Service Providers</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Email Services:</strong> SMTP providers for sending emails</li>
              <li><strong>Shopify:</strong> Accessing your store data (as authorized by you)</li>
              <li><strong>Pinterest:</strong> When you use the Pinterest Stock Sync automation, we use Pinterest’s API with your access token to create Pins (board, image, title, description, link) for out-of-stock products. See <a href="https://policy.pinterest.com/en/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#00bcd4] hover:underline">Pinterest’s Privacy Policy</a> for how Pinterest handles data.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-[#32cd32] mt-6">4.2 Legal Requirements</h3>
            <p className="text-gray-300 leading-relaxed">
              We may disclose your information if required by law or in response to valid requests by public authorities.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#32cd32] mt-6">4.3 Business Transfers</h3>
            <p className="text-gray-300 leading-relaxed">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">5. Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Encryption of sensitive data (AES-256-GCM for Shopify tokens)</li>
              <li>Secure HTTPS connections</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>Secure password storage (hashed, never plain text)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">6. Your Rights (GDPR Compliance)</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you are located in the European Economic Area (EEA), you have certain data protection rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><strong>Right to Access:</strong> Request copies of your personal data</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing</li>
              <li><strong>Right to Data Portability:</strong> Request transfer of your data</li>
              <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, please contact us at support@velocityapps.dev.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">7. Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use cookies and similar tracking technologies:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><strong>Essential Cookies:</strong> Required for authentication and session management</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You can control cookies through your browser settings. However, disabling cookies may limit your ability to use certain features of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">8. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">9. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">10. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#00bcd4]">12. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            <p className="text-gray-300 leading-relaxed mt-2">
              <strong>Email:</strong> support@velocityapps.dev<br />
              <strong>Website:</strong> https://velocityapps.dev
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2a2a2a]">
          <a
            href="/terms"
            className="text-[#00bcd4] hover:text-[#32cd32] transition-colors"
          >
            ← View Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}

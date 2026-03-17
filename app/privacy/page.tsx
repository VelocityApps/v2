export const metadata = {
  title: 'Privacy Policy - VelocityApps',
  description: 'Privacy Policy for VelocityApps - Shopify Automation Platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202223]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-[#6d7175] mb-8">Last updated: 17 March 2026</p>

        <div className="prose max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">1. Who We Are</h2>
            <p className="text-[#6d7175] leading-relaxed">
              VelocityApps ("we", "our", "us") is the data controller for personal data processed through this Service. We are based in the United Kingdom and operate in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>
            <p className="text-[#6d7175] leading-relaxed mt-4">
              <strong>Contact:</strong> hello@velocityapps.dev<br />
              <strong>Website:</strong> https://velocityapps.dev
            </p>
            <p className="text-[#6d7175] leading-relaxed mt-4">
              We are in the process of registering with the Information Commissioner's Office (ICO) as required under UK data protection law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">2. What Data We Collect and Why</h2>
            <p className="text-[#6d7175] leading-relaxed mb-4">
              We collect and process personal data only where we have a lawful basis to do so under UK GDPR Article 6.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#2563eb] mt-6">2.1 Account Information</h3>
            <p className="text-[#6d7175] leading-relaxed">
              <strong>Data:</strong> Email address, password (hashed, never stored in plain text).<br />
              <strong>Lawful basis:</strong> Contract — necessary to provide you with access to the Service.<br />
              <strong>Retention:</strong> For the lifetime of your account, plus 30 days after deletion.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#2563eb] mt-6">2.2 Payment Information</h3>
            <p className="text-[#6d7175] leading-relaxed">
              <strong>Data:</strong> We do not store payment card details. Payments are processed by Stripe, who act as an independent data controller. We retain records of subscription status, billing history, and Stripe customer/subscription IDs.<br />
              <strong>Lawful basis:</strong> Contract and Legal Obligation (financial record-keeping).<br />
              <strong>Retention:</strong> 7 years, as required for VAT and tax purposes.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#2563eb] mt-6">2.3 Shopify Store Data</h3>
            <p className="text-[#6d7175] leading-relaxed">
              <strong>Data:</strong> Your store URL, encrypted access token, and — only when an automation runs — product data, order data, customer names and email addresses, and inventory levels.<br />
              <strong>Lawful basis:</strong> Contract — this data is necessary to execute the automations you have installed.<br />
              <strong>How we handle your customers' data:</strong> We act as a data processor on your behalf when processing your Shopify customers' personal data. You remain the data controller for your customers' data. We process it only to the extent required to run your chosen automations and do not use it for our own purposes.<br />
              <strong>Retention:</strong> Access tokens are retained until you disconnect your store. Customer data accessed during automation runs is not stored beyond what is required to complete the run (typically seconds to minutes).
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#2563eb] mt-6">2.4 Usage and Technical Data</h3>
            <p className="text-[#6d7175] leading-relaxed">
              <strong>Data:</strong> IP address, browser type, pages visited, features used, error logs, automation execution logs.<br />
              <strong>Lawful basis:</strong> Legitimate Interests — to operate, maintain, and improve the Service, and to detect and prevent fraud or abuse.<br />
              <strong>Retention:</strong> Logs retained for 90 days; anonymised analytics retained indefinitely.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#2563eb] mt-6">2.5 Support Communications</h3>
            <p className="text-[#6d7175] leading-relaxed">
              <strong>Data:</strong> Messages and attachments you send via our support system.<br />
              <strong>Lawful basis:</strong> Contract and Legitimate Interests.<br />
              <strong>Retention:</strong> 2 years from ticket closure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">3. Data Processors and Third Parties</h2>
            <p className="text-[#6d7175] leading-relaxed mb-4">
              We use the following third-party services to operate the platform. Each is bound by appropriate data processing agreements and/or standard contractual clauses (SCCs) where data is transferred outside the UK.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-[#6d7175] border-collapse">
                <thead>
                  <tr className="border-b border-[#e1e3e5]">
                    <th className="text-left py-2 pr-4 font-semibold text-[#202223]">Provider</th>
                    <th className="text-left py-2 pr-4 font-semibold text-[#202223]">Purpose</th>
                    <th className="text-left py-2 font-semibold text-[#202223]">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1e3e5]">
                  <tr><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database and authentication</td><td className="py-2">EU (West EU region)</td></tr>
                  <tr><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Payment processing</td><td className="py-2">UK / EU</td></tr>
                  <tr><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Hosting and infrastructure</td><td className="py-2">US (SCCs in place)</td></tr>
                  <tr><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Transactional email delivery</td><td className="py-2">US (SCCs in place)</td></tr>
                  <tr><td className="py-2 pr-4">PostHog</td><td className="py-2 pr-4">Product analytics</td><td className="py-2">EU (EU Cloud)</td></tr>
                  <tr><td className="py-2 pr-4">Sentry</td><td className="py-2 pr-4">Error monitoring</td><td className="py-2">EU (SCCs in place)</td></tr>
                  <tr><td className="py-2 pr-4">Shopify</td><td className="py-2 pr-4">Store data access (your authorisation)</td><td className="py-2">Canada / US</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#6d7175] leading-relaxed mt-4">
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">4. Cookies</h2>
            <p className="text-[#6d7175] leading-relaxed mb-4">
              We use the following categories of cookies:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#6d7175] ml-4">
              <li><strong>Strictly Necessary:</strong> Authentication session cookies required to log you in and keep you logged in. These cannot be disabled without breaking the Service.</li>
              <li><strong>Functional:</strong> Short-lived cookies used during the Shopify OAuth flow (expire within 5 minutes).</li>
              <li><strong>Analytics:</strong> PostHog cookies that help us understand how the Service is used. These are anonymised where possible. You may opt out by contacting us.</li>
            </ul>
            <p className="text-[#6d7175] leading-relaxed mt-4">
              We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">5. Your Rights Under UK GDPR</h2>
            <p className="text-[#6d7175] leading-relaxed mb-4">
              Under UK data protection law, you have the following rights. To exercise any of them, contact us at hello@velocityapps.dev. We will respond within one month.
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#6d7175] ml-4">
              <li><strong>Right of Access:</strong> Request a copy of your personal data (Subject Access Request).</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten"), subject to our legal retention obligations.</li>
              <li><strong>Right to Restrict Processing:</strong> Ask us to pause processing your data in certain circumstances.</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a commonly used machine-readable format.</li>
              <li><strong>Right to Object:</strong> Object to processing based on Legitimate Interests.</li>
              <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
            </ul>
            <p className="text-[#6d7175] leading-relaxed mt-4">
              You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">ico.org.uk</a> or by calling 0303 123 1113.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">6. Data Security</h2>
            <p className="text-[#6d7175] leading-relaxed mb-4">
              We apply appropriate technical and organisational measures to protect personal data, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#6d7175] ml-4">
              <li>AES-256-GCM encryption for Shopify access tokens at rest</li>
              <li>HTTPS (TLS) for all data in transit</li>
              <li>Row-level security on our database (users can only access their own data)</li>
              <li>Access tokens stored server-side only, never exposed to the browser</li>
              <li>Error monitoring via Sentry to detect and address vulnerabilities</li>
            </ul>
            <p className="text-[#6d7175] leading-relaxed mt-4">
              In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the ICO within 72 hours and inform affected individuals without undue delay.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">7. Children</h2>
            <p className="text-[#6d7175] leading-relaxed">
              The Service is intended for business use only and is not directed at individuals under the age of 18. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">8. Changes to This Policy</h2>
            <p className="text-[#6d7175] leading-relaxed">
              We may update this Privacy Policy from time to time. Where changes are material, we will notify you by email at least 14 days before they take effect. The current version is always available at this URL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#2563eb]">9. Contact</h2>
            <p className="text-[#6d7175] leading-relaxed">
              For any privacy-related queries, requests to exercise your rights, or data protection concerns:
            </p>
            <p className="text-[#6d7175] leading-relaxed mt-2">
              <strong>Email:</strong> hello@velocityapps.dev<br />
              <strong>Website:</strong> https://velocityapps.dev
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-[#e1e3e5]">
          <a href="/terms" className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
            ← View Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}

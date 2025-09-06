export default function TermsPage() {
  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using Geulpi Calendar, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="mb-4">
            Geulpi Calendar provides intelligent calendar management services including:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Calendar event creation and management</li>
            <li>Google Calendar synchronization</li>
            <li>OCR-based event extraction from screenshots</li>
            <li>Natural language processing for event creation</li>
            <li>Event notifications and reminders</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p className="mb-4">
            To use our service, you must:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
          <p className="mb-4">
            You agree not to:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Use the service for any illegal or unauthorized purpose</li>
            <li>Violate any laws in your jurisdiction</li>
            <li>Transmit any malicious code or viruses</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
          <p className="mb-4">
            All content, features, and functionality of Geulpi Calendar are owned by us and are protected by 
            international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Privacy</h2>
          <p className="mb-4">
            Your use of our service is also governed by our Privacy Policy. Please review our Privacy Policy, 
            which also governs the site and informs users of our data collection practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
          <p className="mb-4">
            The service is provided "as is" and "as available" without any warranties of any kind, either express 
            or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p className="mb-4">
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, 
            consequential, or punitive damages resulting from your use of or inability to use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. We will notify users of any material changes 
            by posting the new Terms of Service on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
          <p className="mb-4">
            For any questions about these Terms of Service, please contact us at:
          </p>
          <p className="mb-4">
            Email: support@geulpi.com<br />
            Website: https://geulpi-project-10.vercel.app
          </p>
        </section>

        <section className="mb-8">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Last updated: January 2025<br />
            Effective date: January 2025
          </p>
        </section>
      </div>
    </div>
  );
}
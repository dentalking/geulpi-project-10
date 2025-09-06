export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            Geulpi Calendar collects the following information to provide our services:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Email address and name from your Google account</li>
            <li>Calendar events and scheduling data</li>
            <li>Usage data to improve our services</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use your information solely to:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Provide calendar management services</li>
            <li>Sync with Google Calendar</li>
            <li>Send notifications about your events</li>
            <li>Improve our service quality</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
          <p className="mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>All data is encrypted in transit using HTTPS</li>
            <li>Passwords are hashed using bcrypt</li>
            <li>We use secure JWT tokens for authentication</li>
            <li>Database access is restricted and monitored</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
          <p className="mb-4">
            We integrate with the following third-party services:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Google Calendar API for calendar synchronization</li>
            <li>Google OAuth for secure authentication</li>
            <li>Supabase for database services</li>
            <li>Vercel for hosting</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p className="mb-4">
            You have the right to:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Access your personal data</li>
            <li>Request data correction or deletion</li>
            <li>Revoke access permissions at any time</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mb-4">
            Email: support@geulpi.com<br />
            Website: https://geulpi-project-10.vercel.app
          </p>
        </section>

        <section className="mb-8">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Last updated: January 2025
          </p>
        </section>
      </div>
    </div>
  );
}
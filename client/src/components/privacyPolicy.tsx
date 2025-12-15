export default function PrivacyPolicy() {
  return (
   <div className="min-h-screen w-full bg-white dark:bg-[#050505] text-gray-800 dark:text-gray-200 py-16 px-4 md:px-10 transition-colors duration-300">
      
  {/* Header */}
  <div className="max-w-4xl mx-auto text-center mb-12">
    <h1 className="text-4xl font-bold 
      bg-gradient-to-r from-teal-500 to-cyan-500 
      text-transparent bg-clip-text
      dark:from-teal-400 dark:to-cyan-500
    ">
      Privacy Policy
    </h1>

    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
      Last Updated: December 07, 2025
    </p>
  </div>

  {/* Content Card */}
  <div className="
      max-w-4xl mx-auto rounded-2xl p-10 shadow-lg border transition-all duration-300
      bg-white/60 backdrop-blur-xl border-gray-300/40
      dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10
  ">
    <div className="prose prose-neutral dark:prose-invert max-w-none leading-relaxed">
          
          {/* YOUR EXACT CONTENT STARTS — NO CHANGES */}
          
          <p>
            Thank you for using DataPurify.<br />
            We care deeply about your privacy. This Privacy Policy explains what
            information we collect, how we use it, how your files are handled,
            and the choices you have regarding your data.
          </p>

          <p>
            By accessing or using DataPurify, you agree to this Privacy Policy.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>1.1 Information You Provide</h3>

          <p>We collect the following information when you directly interact with DataPurify:</p>

          <ul>
            <li><strong>Account information</strong><br />Name, email address, or any details provided when signing up or logging in.</li>
            <li><strong>Uploaded files</strong><br />CSV, Excel, or other supported files submitted for cleaning, preview, processing, or export.</li>
            <li><strong>Payment information</strong><br />Handled securely by third-party payment processors (e.g., PayPal or Stripe). We never store or access your card details.</li>
            <li><strong>Support messages</strong><br />Feedback, bug reports, or inquiries you send to us.</li>
          </ul>

          <h3>1.2 Information Collected Automatically</h3>
          <ul>
            <li>Usage data – pages visited, actions taken, timestamps</li>
            <li>Device data – IP address, browser type, operating system</li>
            <li>Cookies/session tokens – used strictly for login, security, and a smoother experience</li>
          </ul>

          <h2>2. How We Use Your Information</h2>

          <ul>
            <li>✓ Provide and operate the DataPurify platform</li>
            <li>✓ Process, clean, and preview your uploaded files</li>
            <li>✓ Improve performance, accuracy, and reliability</li>
            <li>✓ Communicate updates, support, and account-related notices</li>
            <li>✓ Detect and prevent misuse, abuse, or security risks</li>
            <li>✓ Manage billing and subscriptions (if applicable)</li>
          </ul>

          <p>We never sell, rent, or trade your data with anyone.</p>

          <h2>3. File & Data Handling (Important)</h2>

          <p>Your uploaded files are used only to provide the features you request, such as:</p>

          <ul>
            <li>Data cleaning</li>
            <li>Smart preview</li>
            <li>Formatting &amp; transformations</li>
            <li>Export generation</li>
          </ul>

          <p><strong>We Do NOT:</strong></p>
          <ul>
            <li>❌ Use your files for AI training</li>
            <li>❌ Share your files with advertising or external companies</li>
            <li>❌ Access your files manually unless you ask for debugging help</li>
          </ul>

          <h3>File Storage & Deletion</h3>
          <ul>
            <li>Files are stored temporarily for processing</li>
            <li>Automatically deleted within 24 hours</li>
            <li>You may manually request deletion earlier</li>
            <li>Deleted files cannot be recovered</li>
          </ul>

          <p>This applies to all users during the beta launch as well.</p>

          <h2>4. How We Protect Your Data</h2>

          <ul>
            <li>Secure HTTPS encryption</li>
            <li>Data encryption in transit and at rest</li>
            <li>Supabase Auth with strict access control</li>
            <li>Isolated file processing</li>
            <li>Activity monitoring and auditing</li>
          </ul>

          <p>
            While no online system is 100% secure, we take reasonable steps to protect your information.
          </p>

          <h2>5. Your Rights</h2>
          <ul>
            <li>Access to your data</li>
            <li>Correction of inaccurate information</li>
            <li>Deletion of your account</li>
            <li>Deletion of uploaded files</li>
            <li>Export of your data</li>
            <li>Withdrawal of consent</li>
          </ul>

          <p>To make any request, contact:<br />
            📩 datapurify@gmail.com</p>

          <h2>6. Third-Party Services We Use</h2>

          <ul>
            <li>Supabase — authentication, storage, database</li>
            <li>Vercel — hosting & deployment</li>
            <li>PayPal / Stripe — payments (if applicable)</li>
          </ul>

          <h2>7. Cookies</h2>
          <ul>
            <li>Keep you signed in</li>
            <li>Maintain secure sessions</li>
            <li>Improve user experience</li>
          </ul>

          <p>Disabling cookies may limit certain features.</p>

          <h2>8. Children’s Privacy</h2>
          <p>DataPurify is not intended for children under 13.<br />
            We do not knowingly collect information from children.</p>

          <h2>9. Beta Use Notice (Important)</h2>
          <ul>
            <li>Features may change</li>
            <li>Some logs may be collected to improve stability</li>
            <li>Occasional bugs may occur</li>
            <li>Avoid uploading extremely sensitive datasets during beta</li>
          </ul>

          <p>Your feedback helps us improve the product.</p>

          <h2>10. No Data Processing Agreement (DPA)</h2>

          <p>
            Since DataPurify is an early-stage product and not yet serving enterprise clients, we currently do not provide a Data Processing Agreement (DPA).<br />
            Users act as individual consumers, and uploaded files are processed automatically and deleted within 24 hours.
          </p>

          <p>A DPA may be added in later commercial versions.</p>

          <h2>11. Policy Updates</h2>
          <p>
            We may update this Privacy Policy as the platform evolves.<br />
            Major changes will be communicated through email or on the website.
          </p>

          <h2>12. Contact Us</h2>

          <p>
            If you have questions or concerns about this Privacy Policy, contact:<br />
            📩 datapurify@gmail.com
          </p>

          {/* YOUR EXACT CONTENT ENDS */}
        </div>
      </div>
    </div>
  );
}

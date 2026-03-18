import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — PrivacyLayer",
  description: "PrivacyLayer privacy policy. We collect nothing. Everything runs in your browser.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-semibold text-sm tracking-tight">PrivacyLayer</span>
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 sm:px-5 py-14">
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-6">
          Legal
        </p>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 18, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">The short version</h2>
            <p className="text-muted-foreground">
              PrivacyLayer collects <strong className="text-foreground">nothing</strong>. No analytics. No telemetry.
              No personal data. No cookies. All processing happens locally in your browser or device.
              Nothing you type, upload, or scan is ever sent to our servers — because we have no servers
              that process your content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">What data we collect</h2>
            <p className="text-muted-foreground">None. The PrivacyLayer web app and Chrome extension operate entirely client-side.</p>
            <ul className="space-y-2 text-muted-foreground list-none">
              {[
                "Documents you upload or paste are processed in your browser tab and never transmitted",
                "The token vault (mapping of placeholders to real values) exists only in memory for the duration of your session",
                "No account, login, or registration is required or offered",
                "No cookies are set",
                "No third-party analytics or tracking scripts are loaded",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-accent shrink-0 font-mono">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">Chrome extension</h2>
            <p className="text-muted-foreground">
              The PrivacyLayer Chrome extension requests the following permissions:
            </p>
            <div className="border border-border">
              {[
                ["activeTab", "Read the text content of the current tab so we can detect and remove personal data before it is sent to an AI model."],
                ["storage", "Save your extension settings (on/off, auto-scan, auto-clean) locally on your device using Chrome's storage API. No data is synced to any server."],
              ].map(([perm, reason]) => (
                <div key={perm} className="px-4 py-3 border-b border-border last:border-b-0">
                  <p className="font-mono text-xs text-accent mb-1">{perm}</p>
                  <p className="text-muted-foreground text-xs">{reason}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground">
              The extension injects a content script into ChatGPT, Claude, and Gemini pages only.
              It reads text from the input field you are typing in, processes it locally using
              pattern matching, and replaces personal data with tokens — all within your browser.
              No content is transmitted to PrivacyLayer servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">Infrastructure</h2>
            <p className="text-muted-foreground">
              The PrivacyLayer website is hosted on Vercel. Vercel may collect standard server
              access logs (IP address, request path, timestamp) as part of normal CDN and hosting
              operations. This is outside our control and governed by{" "}
              <a href="https://vercel.com/legal/privacy-policy" className="text-accent hover:underline" target="_blank" rel="noreferrer">
                Vercel's privacy policy
              </a>.
              No document content or personal data you process with PrivacyLayer is included in
              these logs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">Open source</h2>
            <p className="text-muted-foreground">
              PrivacyLayer is open source. You can verify every claim in this policy by reading
              the source code at{" "}
              <a href="https://github.com/terencela/privacylayer" className="text-accent hover:underline" target="_blank" rel="noreferrer">
                github.com/terencela/privacylayer
              </a>.
              There are no hidden network requests. There is no server-side processing of your documents.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">Changes</h2>
            <p className="text-muted-foreground">
              If this policy changes materially, we will update the date at the top of this page
              and commit the change to the public GitHub repository.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold border-b border-border pb-2">Contact</h2>
            <p className="text-muted-foreground">
              Questions? Open an issue at{" "}
              <a href="https://github.com/terencela/privacylayer/issues" className="text-accent hover:underline" target="_blank" rel="noreferrer">
                github.com/terencela/privacylayer/issues
              </a>.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}

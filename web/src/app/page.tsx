import Link from "next/link";

const TOOLS = [
  {
    id: "convertibles-analyser",
    title: "Convertibles Analyser",
    description:
      "Calculate the expected gold and SB value of any convertible using live marketplace prices.",
    href: "/convertibles-analyser",
    enabled: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    ),
  },
  {
    id: "profile-card",
    title: "Hunter Profile",
    description:
      "Generate a beautiful profile card showcasing your hunter stats, crowns, and achievements.",
    href: "#",
    enabled: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="hero-gradient min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
        {/* Decorative orb */}
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,178,50,0.4), transparent 70%)" }}
        />

        <h1
          className="relative text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-4 animate-fade-in"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          All your{" "}
          <span className="glow-gold" style={{ color: "var(--accent)" }}>
            MouseHunt
          </span>
          <br />
          tools in one place.
        </h1>

        <p
          className="relative text-base sm:text-lg max-w-lg mb-10 animate-fade-in"
          style={{ color: "var(--text-secondary)", animationDelay: "0.1s" }}
        >
          Analyse convertible values, track marketplace prices, and showcase your
          hunter profile — instantly.
        </p>

        {/* CTA search-like box (links to convertibles analyser) */}
        <Link
          href="/convertibles-analyser"
          className="relative group flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-medium transition-all animate-fade-in"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            animationDelay: "0.2s",
            backdropFilter: "blur(12px)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span>Search for a convertible to analyse...</span>
          <span
            className="ml-8 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--bg-primary)",
            }}
          >
            Go
          </span>
        </Link>
      </section>

      {/* Tools Grid */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-in">
          {TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={tool.enabled ? tool.href : "#"}
              className="glass-card glass-card-hover p-6 block group"
              style={{
                opacity: tool.enabled ? 1 : 0.5,
                pointerEvents: tool.enabled ? "auto" : "none",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="text-base font-semibold"
                      style={{
                        fontFamily: "var(--font-heading)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {tool.title}
                    </h3>
                    {!tool.enabled && (
                      <span
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "var(--bg-tertiary)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {tool.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
        }}
      >
        GnawniaVerse &middot; Community tools for MouseHunt
      </footer>
    </div>
  );
}

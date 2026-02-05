import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LandingPage = () => {
  const { user, signIn: login, signOut: logout } = useAuth();
  const navigate = useNavigate();

  const handleStartBuilding = async () => {
    if (!user) {
      await login();
    }
    navigate('/workspace/new');
  };

  return (
    <div className="min-h-screen bg-background-dark text-white font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-onyx-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">terminal</span>
            <span className="text-2xl font-bold font-display tracking-tight">OnyxGPT<span className="text-primary">.Dev</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-onyx-text-muted">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#showcase" className="hover:text-primary transition-colors">Showcase</a>
            <a href="#" className="hover:text-primary transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button onClick={() => navigate('/workspace/new')} className="text-sm font-bold hover:text-primary transition-colors">My Projects</button>
                <button onClick={logout} className="bg-onyx-card border border-onyx-border px-4 py-2 rounded-lg text-sm font-bold hover:border-white transition-all">Logout</button>
              </>
            ) : (
              <>
                <button onClick={login} className="text-sm font-bold hover:text-primary transition-colors">Log In</button>
                <button onClick={handleStartBuilding} className="bg-primary hover:bg-[#00c4b3] text-background-dark px-5 py-2.5 rounded-lg text-sm font-bold shadow-glow hover:shadow-glow-hover transition-all duration-300">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute top-40 left-1/4 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              v2.0 Now Live - Powered by Gemini 2.0
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight leading-tight">
              Build the future <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#00f2fe]">at the speed of thought</span>
            </h1>
            <p className="text-xl text-onyx-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
              The world's first AI-native IDE that turns your ideas into full-stack applications in seconds. No setup, no boilerplate, just pure creation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <button onClick={handleStartBuilding} className="bg-primary hover:bg-[#00c4b3] text-background-dark px-8 py-4 rounded-lg text-lg font-bold shadow-glow hover:shadow-glow-hover transition-all duration-300 flex items-center justify-center gap-2">
                Start Building for Free
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button className="bg-transparent border border-onyx-border hover:border-white text-white px-8 py-4 rounded-lg text-lg font-bold transition-all">
                View Demo
              </button>
            </div>

            {/* Mock IDE Preview */}
            <div className="relative group max-w-5xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-onyx-card border border-onyx-border rounded-xl shadow-2xl overflow-hidden aspect-video">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-onyx-border bg-[#1a1a1a]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                  </div>
                  <div className="mx-auto flex items-center gap-2 bg-black/20 px-4 py-1 rounded-md border border-white/5 text-[10px] text-gray-400 font-mono">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    onyxgpt.dev/workspace/new-project
                  </div>
                </div>
                <div className="flex h-full">
                  <div className="w-1/4 border-r border-onyx-border bg-[#121212] p-4 hidden md:block">
                    <div className="flex flex-col gap-4">
                      <div className="h-4 w-3/4 bg-white/5 rounded"></div>
                      <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                      <div className="h-4 w-2/3 bg-white/5 rounded"></div>
                      <div className="mt-8 h-4 w-full bg-primary/10 rounded"></div>
                    </div>
                  </div>
                  <div className="flex-1 bg-black p-6 flex flex-col">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-sm">robot_2</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-4 w-1/3 bg-primary/20 rounded mb-2"></div>
                        <div className="h-4 w-full bg-white/5 rounded mb-2"></div>
                        <div className="h-4 w-2/3 bg-white/5 rounded"></div>
                      </div>
                    </div>
                    <div className="mt-auto bg-[#111] border border-white/5 rounded-lg p-4 flex items-center gap-3">
                      <div className="flex-1 h-4 bg-white/5 rounded"></div>
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-background-dark text-sm">send</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 border-y border-onyx-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Engineered for Builders</h2>
              <p className="text-onyx-text-muted">Everything you need to go from zero to one.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group bg-onyx-card border border-onyx-border hover:border-primary/50 rounded-xl p-8 transition-all duration-300 hover:shadow-glow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                <div className="w-12 h-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-6 text-primary border border-white/5">
                  <span className="material-symbols-outlined text-2xl">chat</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Natural Language Coding</h3>
                <p className="text-onyx-text-muted text-sm leading-relaxed mb-6">
                  Describe your app in plain English. The AI architect writes, debugs, and refactors complex logic in real-time.
                </p>
                <div className="bg-[#111] border border-white/5 rounded p-3 font-mono text-[10px] text-gray-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-purple-400">user</span>: "Add a dark mode toggle"<br/>
                  <span className="text-primary">ai</span>: Implementing ThemeContext...
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group bg-onyx-card border border-onyx-border hover:border-primary/50 rounded-xl p-8 transition-all duration-300 hover:shadow-glow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                <div className="w-12 h-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-6 text-primary border border-white/5">
                  <span className="material-symbols-outlined text-2xl">deployed_code</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Sandboxed Environment</h3>
                <p className="text-onyx-text-muted text-sm leading-relaxed mb-6">
                  Run full-stack web applications directly in your browser with secure, zero-config WebContainers technology.
                </p>
                <div className="bg-[#111] border border-white/5 rounded p-3 font-mono text-[10px] text-gray-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Server running on :3000
                  </div>
                  <div className="h-1 w-full bg-[#333] rounded overflow-hidden">
                    <div className="h-full bg-primary w-2/3"></div>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group bg-onyx-card border border-onyx-border hover:border-primary/50 rounded-xl p-8 transition-all duration-300 hover:shadow-glow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                <div className="w-12 h-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-6 text-primary border border-white/5">
                  <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">One-Click Deploy</h3>
                <p className="text-onyx-text-muted text-sm leading-relaxed mb-6">
                  Push your generated application straight to production with a single click. No DevOps pipelines required.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <button className="text-xs font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    Deploy Now <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="showcase" className="py-20 px-6 bg-[#0f0f0f]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">What will you build?</h2>
                <p className="text-onyx-text-muted">Explore the endless possibilities with OnyxGPT.</p>
              </div>
              <button className="text-white border border-onyx-border hover:border-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
                View Showcase
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Dashboards', subtitle: 'Data visualization apps', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9wxQXj7BTFwnPMHzjA4tGEH3dJatehqCB5fKCkZ51GBhrNGkvNFyHBzaqEzpo918oww3SNXGW5KBghnlyRa4XGZcOjuW910qeRgWwunupOq5wlxqOW96a7fvTd_udWDD-61-B9fAGMAEUlz5X8D-qJFAMFcUrd1NLTraEL8eMTi5fpah33a7EAazMcJUnjV9Gx_73E6I3SqHmwqN68auvnkTJ6AOhec9YHRgKV7xz8puJhcy___aepHZJRLiBCAqm_tOME3LjC6kn' },
                { title: 'E-Commerce', subtitle: 'Storefronts & carts', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF8AT5vXCBewV2gH35kZRGkc7Xl3-djcVssmpTkYsfbsTNSgbcoMxXHv_a9oNCRZUsT1iLy5J7fqFvmY_fU4Y8xVpv9qNpTpSunLL3MGeyqZ0geoAH-g1SfcOudDGhvuj2T2BtHfbKJYwJcLz7cdgV4X8QRhQDK7iHil6BGqvjiWnPDQq2Oe5-fyM4EENaOVWn6OSll-iyCmwvDXdYSYKzL5FwCwVbhsBO3jpHlmMGRq9Gx_qLy7uN9rPpDtLhJzzwDWndhQyJ6h1F' },
                { title: 'Landing Pages', subtitle: 'Marketing sites', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMAx2oWA2Jcsv_NkCQSkEdLaxNwnpCnUUGQnOHq8l1ZD-zYBmwp6yll6xyA79EectYyyuWt2_nM7KXBDQAr4ZQ6OjqgDPB0VDIBJo5bC5y816MoPQZxlYjt718QQernyFhO9jTNewaLsvQp8tyvnli0PJPSNJPcEZp1NyAZCKe2DjYpGyR-8tWnxouCoSN_Aqr0zdLoOIFiU-xlQfPOurbHUGNIBKJllXjrvxLDC_1Ca6Gp4_PuyyuucnVivVwIrzAwqnIrKpF0vci' },
                { title: 'SaaS Tools', subtitle: 'Productivity apps', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUMtmlKPaw8ATjf6bcqbYAciBuME8eHBvONu0FZdMgTPAYJMc3hF_haFpRAMm8wRG4q2234r9Dhagm2-ezpyRlz-RrLvS-79r7XqybFqBuf8--AwqagDHPN7-eXEMTwJIC8J9W3Kt88OLLRKGIRIZwTC8MuhuEVYLV2m9F6aPkOKjnDBxcXJGuIRQDPyeTGMLkArPOoleyV5sVDUO2dtwjyRMyGzckljysJEnhDDSiswrkctBCcG6HtDVLS2aUFN-GY13DhVeE1i0I' }
              ].map((item, i) => (
                <div key={i} className="group relative rounded-lg overflow-hidden aspect-square cursor-pointer">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${item.img}')` }}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
                    <h4 className="text-white font-bold text-lg translate-y-2 group-hover:translate-y-0 transition-transform">{item.title}</h4>
                    <p className="text-gray-400 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background-dark to-[#0f1f1d]"></div>
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">Ready to code at the speed of thought?</h2>
            <p className="text-xl text-onyx-text-muted mb-10">Join 10,000+ developers building the future with OnyxGPT.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={handleStartBuilding} className="bg-primary hover:bg-[#00c4b3] text-background-dark px-8 py-4 rounded-lg text-lg font-bold shadow-glow hover:shadow-glow-hover transition-all duration-300">
                Start Building for Free
              </button>
              <button className="bg-transparent border border-onyx-border hover:border-white text-white px-8 py-4 rounded-lg text-lg font-bold transition-all">
                Read Documentation
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-onyx-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">terminal</span>
              <span className="text-white font-bold font-display text-lg">OnyxGPT.Dev</span>
            </div>
            <p className="text-onyx-text-muted text-sm">© 2025 Onyx Technologies Inc.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-onyx-text-muted">
            <a className="hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
            <a className="hover:text-primary transition-colors" href="#">Twitter</a>
            <a className="hover:text-primary transition-colors" href="#">Discord</a>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-onyx-border">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-mono text-gray-300">System Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

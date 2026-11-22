import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { AppthonLogo } from './ui/AppthonLogo';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Home', hash: '#home' },
  { label: 'About', hash: '#about' },
  { label: 'Roadmap', hash: '#roadmap' },
  { label: 'Categories', hash: '#categories' },
  { label: 'Prizes', hash: '#prizes' },
  { label: 'FAQ', hash: '#faq' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSectionClick = (hash: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate(`/${hash}`);
      return;
    }
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const portalPath =
    user?.role === 'Judge'
      ? '/judge'
      : user && ['Super Admin', 'Event Manager', 'Registration Manager', 'Read-only Staff'].includes(user.role)
        ? '/admin'
        : '/dashboard';

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4"
    >
      <div
        className={`liquid-glass-nav mx-auto flex max-w-[1260px] items-center justify-between gap-4 rounded-full px-4 py-2 sm:px-6 sm:py-2.5 ${
          scrolled ? 'is-scrolled' : ''
        }`}
      >
        {/* Left: APPTHON logo */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A64AFF] rounded-md shrink-0"
        >
          <AppthonLogo />
        </Link>

        {/* Center: Public section navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-[13px] font-medium tracking-wide text-white/80"
        >
          {NAV_LINKS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSectionClick(item.hash)}
              className="whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-white cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: Auth / Portal actions */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {user ? (
            <>
              <Link
                to={portalPath}
                className="text-[13px] font-medium text-white/85 hover:text-white whitespace-nowrap shrink-0 transition-colors"
              >
                {user.role === 'Judge'
                  ? 'Judge Portal'
                  : user.role === 'Student'
                    ? 'Dashboard'
                    : 'Admin Portal'}
              </Link>
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/'))}
                className="hero-btn-secondary rounded-full px-4 py-1.5 text-xs font-medium text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[13px] font-medium text-white/85 hover:text-white whitespace-nowrap shrink-0 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hero-btn-primary rounded-full px-5 py-1.5 text-xs font-medium text-white whitespace-nowrap shrink-0"
              >
                Register Your Team
              </Link>
            </>
          )}
        </div>

        {/* Tablet/Mobile Quick Action + Menu Trigger */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          {!user && (
            <Link
              to="/register"
              className="hidden sm:inline-flex hero-btn-primary rounded-full px-4 py-1.5 text-xs font-medium text-white whitespace-nowrap shrink-0"
            >
              Register Your Team
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden mx-auto mt-2 max-w-[1260px] rounded-2xl border border-white/20 bg-[#080B18]/92 backdrop-blur-xl p-5 shadow-2xl">
          <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
            {NAV_LINKS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSectionClick(item.hash)}
                className="text-left py-2.5 text-sm font-medium text-white/85 hover:text-white border-b border-white/10 cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            {user ? (
              <>
                <Link
                  to={portalPath}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 hero-btn-primary rounded-full px-5 py-2.5 text-center text-sm font-medium text-white whitespace-nowrap"
                >
                  Open Portal
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout().then(() => navigate('/'));
                  }}
                  className="flex-1 hero-btn-secondary rounded-full px-5 py-2.5 text-center text-sm font-medium text-white/90 whitespace-nowrap cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 hero-btn-secondary rounded-full px-5 py-2.5 text-center text-sm font-medium text-white whitespace-nowrap"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 hero-btn-primary rounded-full px-5 py-2.5 text-center text-sm font-medium text-white whitespace-nowrap"
                >
                  Register Your Team
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </motion.header>
  );
}

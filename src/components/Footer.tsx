import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppthonLogo } from './ui/AppthonLogo';

export function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = (hash: string) => {
    if (location.pathname !== '/') {
      navigate(`/${hash}`);
      return;
    }
    const id = hash.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#C4A1FF]/12 bg-[#080812]/80 backdrop-blur-sm px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <AppthonLogo />
            <p className="text-sm text-white/70">
              Organized by <span className="font-medium text-white">Skill AI</span>
            </p>
            <p className="text-sm text-white/55">Mangaluru, Karnataka, India</p>
            <p className="text-xs tracking-[0.14em] text-[#A64AFF] uppercase">
              BUILD YOUR IDEA. LAUNCH YOUR APPLICATION.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm sm:grid-cols-3">
            <button
              type="button"
              onClick={() => goToSection('#about')}
              className="text-left text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => goToSection('#roadmap')}
              className="text-left text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => goToSection('#categories')}
              className="text-left text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => goToSection('#faq')}
              className="text-left text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              FAQs
            </button>
            <Link to="/privacy" className="text-white/70 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white/70 hover:text-white transition-colors">
              Terms and Conditions
            </Link>
            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/register" className="text-white/70 hover:text-white transition-colors">
              Register
            </Link>
            <Link to="/verify" className="text-white/70 hover:text-white transition-colors">
              Verify Certificate
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} APPTHON · Skill AI, Mangaluru, Karnataka, India.</p>
          <p>Application Building Challenge · Free Registration · Teams of 2–5</p>
        </div>
      </div>
    </footer>
  );
}

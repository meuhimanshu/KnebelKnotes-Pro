import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, Settings, Home, LayoutGrid, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import knebelLogo from "@/assets/knebel-logo.png";
import AuthBar from "@/components/AuthBar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const showSubAdminTab = profile?.role === "sub_admin";
  const isHome = location.pathname === "/";

  const headerClass = cn(
    "sticky top-0 z-50 border-b transition-colors",
    isHome
      ? "border-transparent bg-transparent sm:border-border/70 sm:bg-background/85 sm:backdrop-blur supports-[backdrop-filter]:sm:bg-background/70"
      : "border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70",
  );

  const navLinkClass = cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    "text-black hover:text-black/80 dark:text-white dark:hover:text-white/80",
  );

  const logoTitleClass = cn(
    "max-w-[160px] truncate font-display text-base font-bold leading-tight sm:max-w-none sm:text-lg",
    "text-black dark:text-white",
  );

  const logoSubtitleClass = cn(
    "hidden text-[10px] font-medium uppercase tracking-widest sm:block",
    isHome ? "text-primary-foreground/70 sm:text-muted-foreground" : "text-muted-foreground",
  );

  const iconButtonClass = cn(
    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
    "text-black hover:text-black/80 dark:text-white dark:hover:text-white/80 hover:bg-muted",
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  return (
    <header className={headerClass}>
      <div className="container flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={knebelLogo} alt="Knebel Knebel Knotes logo" className="h-8 w-8 sm:h-9 sm:w-9" />
          <div className="flex flex-col">
            <span className={logoTitleClass}>
              Knebel Knebel Knotes
            </span>
            <span className={logoSubtitleClass}>
              Psychiatry Reference
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1.5 md:flex">
          <Link
            to="/"
            className={navLinkClass}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            to="/categories"
            className={navLinkClass}
          >
            <LayoutGrid className="h-4 w-4" />
            Categories
          </Link>
          <Link
            to="/search"
            className={navLinkClass}
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
          {showSubAdminTab && (
            <Link
              to="/sub-admin"
              className={navLinkClass}
            >
              <Shield className="h-4 w-4" />
              Sub Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center md:flex">
            <AuthBar variant="desktop" />
          </div>

          <ThemeToggle />
          <Link
            to="/settings"
            className={cn(iconButtonClass, "hidden sm:flex")}
            aria-label="Account settings"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* Search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={iconButtonClass}
            aria-label="Toggle search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(iconButtonClass, "md:hidden")}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-border/70 bg-background/95 px-4 py-3 animate-fade-in">
          <form onSubmit={handleSearch} className="container flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Search disorders, medications, criteria..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm" className="w-full sm:w-auto">
              Search
            </Button>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="border-t border-border/70 bg-background/95 p-3 animate-fade-in md:hidden sm:p-4">
          <div className="flex flex-col gap-1.5">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-black hover:bg-muted dark:text-white"
            >
              <Home className="h-5 w-5" />
              Home
            </Link>
            <Link
              to="/categories"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-black hover:bg-muted dark:text-white"
            >
              <LayoutGrid className="h-5 w-5" />
              Categories
            </Link>
            <Link
              to="/search"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-black hover:bg-muted dark:text-white"
            >
              <Search className="h-5 w-5" />
              Search
            </Link>
            <Link
              to="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-black hover:bg-muted dark:text-white"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            {showSubAdminTab && (
              <Link
                to="/sub-admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-black hover:bg-muted dark:text-white"
              >
                <Shield className="h-5 w-5" />
                Sub Admin
              </Link>
            )}
          </div>
          <div className="mt-4 border-t border-border/70 pt-4">
            <AuthBar variant="mobile" />
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;

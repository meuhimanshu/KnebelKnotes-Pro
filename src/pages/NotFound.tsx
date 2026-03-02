import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <div className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-4 py-1 text-xs font-medium text-muted-foreground">
          Error 404
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Page not found</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          The page you are trying to reach does not exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </Layout>
  );
};

export default NotFound;

import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SubAdmin = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 text-center text-sm text-muted-foreground">Loading dashboard...</div>
      </Layout>
    );
  }

  if (profile?.role !== "sub_admin") {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">This tab is available to Sub Admins only.</p>
          <Button asChild className="mt-4">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">Sub Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use this space for sub-admin-specific tools and content updates.
        </p>
      </div>
    </Layout>
  );
};

export default SubAdmin;

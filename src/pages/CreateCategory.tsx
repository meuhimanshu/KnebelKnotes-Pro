import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

const CreateCategory = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || (profile?.role !== "super_admin" && profile?.role !== "sub_admin")) {
      toast.error("You do not have permission to create a category.");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter a category name.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      description: description.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Category created.");
    navigate("/categories");
  };

  return (
    <Layout>
      <section className="container py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Create Category</h1>
          <p className="mt-2 text-muted-foreground">Add a new category to organize content.</p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Checking session...</div>
        ) : !user ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Log in required</CardTitle>
              <CardDescription>Log in to create a new category.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link to="/login">Go to login</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : profile?.role !== "super_admin" && profile?.role !== "sub_admin" ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Admin access required</CardTitle>
              <CardDescription>Only admins can create categories.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="secondary">
                <Link to="/categories">Back to categories</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <CardHeader>
                <CardTitle>New Category</CardTitle>
                <CardDescription>Provide a name and optional description.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g., Anxiety Disorders"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Short description (optional)"
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => navigate("/categories")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create category"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </section>
    </Layout>
  );
};

export default CreateCategory;

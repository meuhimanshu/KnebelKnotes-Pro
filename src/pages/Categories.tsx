import { useCallback, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

const Categories = () => {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, description")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setCategories(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      await loadCategories();
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadCategories]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Sign in to create a category.");
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
    setName("");
    setDescription("");
    setLoading(true);
    setError(null);
    await loadCategories();
  };

  return (
    <Layout>
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">All Categories</h1>
          <p className="mt-2 text-muted-foreground">Browse or create categories for now.</p>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading categories...</div>}

        {!authLoading && user && (
          <Card className="mb-8">
            <form onSubmit={handleCreate}>
              <CardHeader>
                <CardTitle>Create Category</CardTitle>
                <CardDescription>Add a new category to organize content.</CardDescription>
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
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create category"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {error && (
          <div className="rounded-xl border border-border bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-sm text-muted-foreground">
            {authLoading
              ? "No categories yet."
              : user
                ? "No categories yet. You can create the first one once the create form is added."
                : "No categories yet. Sign in to create the first one."}
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-border bg-card p-5 shadow-[var(--card-shadow)]"
              >
                <h3 className="font-display text-base font-semibold text-foreground">{category.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {category.description || "No description provided yet."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Categories;

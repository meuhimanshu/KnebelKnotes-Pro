import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type CategoryDetailRecord = {
  id: string;
  name: string;
  description: string | null;
  diagnosis: string | null;
  treatment: string | null;
  improvement: string | null;
  reassessment: string | null;
  trial: string | null;
};

const SECTIONS = [
  { key: "diagnosis", label: "Diagnosis" },
  { key: "treatment", label: "Treatment" },
  { key: "improvement", label: "Improvement" },
  { key: "reassessment", label: "Reassessment" },
  { key: "trial", label: "Trial" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<CategoryDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectionKey>("diagnosis");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<SectionKey, string>>({
    diagnosis: "",
    treatment: "",
    improvement: "",
    reassessment: "",
    trial: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadCategory = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, description, diagnosis, treatment, improvement, reassessment, trial")
        .eq("id", id)
        .maybeSingle();

      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setCategory(null);
        setLoading(false);
        return;
      }

      setCategory(data);
      setDraft({
        diagnosis: data.diagnosis ?? "",
        treatment: data.treatment ?? "",
        improvement: data.improvement ?? "",
        reassessment: data.reassessment ?? "",
        trial: data.trial ?? "",
      });
      setLoading(false);
    };

    void loadCategory();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const canEdit = useMemo(
    () => !authLoading && (profile?.role === "super_admin" || profile?.role === "sub_admin"),
    [authLoading, profile?.role],
  );

  const handleJump = (key: SectionKey) => {
    setActiveTab(key);
    const element = document.getElementById(`section-${key}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancel = () => {
    if (!category) return;
    setDraft({
      diagnosis: category.diagnosis ?? "",
      treatment: category.treatment ?? "",
      improvement: category.improvement ?? "",
      reassessment: category.reassessment ?? "",
      trial: category.trial ?? "",
    });
    setEditing(false);
  };

  const handleSave = async () => {
    if (!category) return;
    setSaving(true);
    const { error } = await supabase
      .from("categories")
      .update({
        diagnosis: draft.diagnosis.trim() || null,
        treatment: draft.treatment.trim() || null,
        improvement: draft.improvement.trim() || null,
        reassessment: draft.reassessment.trim() || null,
        trial: draft.trial.trim() || null,
      })
      .eq("id", category.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Category updated.");
    setCategory({
      ...category,
      diagnosis: draft.diagnosis.trim() || null,
      treatment: draft.treatment.trim() || null,
      improvement: draft.improvement.trim() || null,
      reassessment: draft.reassessment.trim() || null,
      trial: draft.trial.trim() || null,
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 text-center text-sm text-muted-foreground">Loading category...</div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Category not found</h1>
          <Link to="/categories" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Back to categories
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-10">
        <div className="container py-10">
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/categories" className="hover:text-foreground transition-colors">
              Categories
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{category.name}</span>
          </nav>

          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground">{category.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {category.description || "No description provided yet."}
            </p>
          </div>
        </div>

        <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="container flex flex-wrap items-center gap-2 py-2">
            <div className="flex flex-wrap items-center gap-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => handleJump(section.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeTab === section.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>
            {canEdit && (
              <div className="ml-auto flex items-center gap-2">
                {editing ? (
                  <>
                    <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="container mt-6">
            <div className="rounded-xl border border-border bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          </div>
        )}

        <div className="container space-y-8 py-8">
          {SECTIONS.map((section) => (
            <section key={section.key} id={`section-${section.key}`} className="scroll-mt-28">
              <h2 className="font-display text-xl font-semibold text-foreground">{section.label}</h2>
              <div className="mt-3">
                {editing ? (
                  <Textarea
                    value={draft[section.key]}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, [section.key]: event.target.value }))
                    }
                    placeholder={`Add ${section.label.toLowerCase()} notes...`}
                    rows={6}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {draft[section.key] || "No information yet."}
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default CategoryDetail;

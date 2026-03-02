export interface Category {
  id: string;
  title: string;
  description: string;
  icon: string;
  parentId: string | null;
  articleCount: number;
}

export interface Article {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  updatedAt: string;
  author: string;
  tags: string[];
}

export const categories: Category[] = [];

export const articles: Article[] = [];

export const getSubcategories = (parentId: string) =>
  categories.filter((c) => c.parentId === parentId);

export const getRootCategories = () =>
  categories.filter((c) => c.parentId === null);

export const getCategoryById = (id: string) =>
  categories.find((c) => c.id === id);

export const getArticlesByCategory = (categoryId: string) =>
  articles.filter((a) => a.categoryId === categoryId);

export const getArticleBySlug = (slug: string) =>
  articles.find((a) => a.slug === slug);

export const searchArticles = (query: string) => {
  const lower = query.toLowerCase();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.excerpt.toLowerCase().includes(lower) ||
      a.tags.some((t) => t.toLowerCase().includes(lower))
  );
};

export type BackendCategory = {
  id?: number;
  name: string;
  slug: string;
  order?: number;
  subcategories?: Array<{
    id?: number;
    name: string;
    slug: string;
    order?: number;
  }>;
};

export const specialCategoryOptions: BackendCategory[] = [
  { name: "Trending", slug: "trending" },
  { name: "New", slug: "new" },
  { name: "Closing Soon", slug: "closing-soon" },
  { name: "Saved", slug: "saved" },
  { name: "Resolved", slug: "resolved" },
];

export const specialCategorySlugs = new Set(specialCategoryOptions.map((category) => category.slug));

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const formatSlug = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export async function fetchBackendCategories(): Promise<BackendCategory[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return specialCategoryOptions;

  try {
    const response = await fetch(`${baseUrl}/api/brokerage/categories/`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return specialCategoryOptions;
    }

    const leadingSpecialCategories = specialCategoryOptions.slice(0, 2);
    const trailingSpecialCategories = specialCategoryOptions.slice(2);

    return [
      ...leadingSpecialCategories,
      ...data.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug || toSlug(category.name),
        order: category.order,
        subcategories: Array.isArray(category.subcategories)
          ? category.subcategories.map((subcategory: any) => ({
              id: subcategory.id,
              name: subcategory.name,
              slug: subcategory.slug || toSlug(subcategory.name),
              order: subcategory.order,
            }))
          : [],
      })),
      ...trailingSpecialCategories,
    ];
  } catch (error) {
    console.error("Failed to load categories from backend", error);
    return specialCategoryOptions;
  }
}

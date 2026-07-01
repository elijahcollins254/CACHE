import MarketBrowse from "@/components/MarketBrowse";

type CategoryPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug = [] } = await params;
  const [categorySlug, subcategorySlug, leagueSlug] = slug;

  return <MarketBrowse categorySlug={categorySlug} subcategorySlug={subcategorySlug} leagueSlug={leagueSlug} />;
}

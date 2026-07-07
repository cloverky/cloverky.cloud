import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FeaturePage } from "@/components/feature-page";
import {
  FEATURE_SLUGS,
  getFeaturePage,
  type FeatureSlug,
} from "@/lib/feature-pages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getFeaturePage(slug);
  if (!config) {
    return { title: "기능을 찾을 수 없음 | FridgeAI" };
  }
  return {
    title: `${config.title} | FridgeAI`,
    description: config.tagline,
  };
}

export default async function FeatureDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const config = getFeaturePage(slug);
  if (!config) {
    notFound();
  }

  return <FeaturePage slug={slug as FeatureSlug} />;
}

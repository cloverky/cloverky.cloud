"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_FEATURE_LINKS } from "@/lib/feature-pages";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            주요 기능
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            FridgeAI의 똑똑한 AI가 함께 제공하는
            <br />
            스마트한 기능들을 만나보세요.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {HOME_FEATURE_LINKS.map((feature) => (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/50 hover:bg-card/80 sm:p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary sm:h-12 sm:w-12">
                <feature.icon className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground sm:mt-4 sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                {feature.description.replace(/\n/g, " ")}
              </p>
              <span className="mt-auto inline-flex items-center pt-3 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100 sm:pt-4 sm:text-sm">
                자세히 보기
                <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

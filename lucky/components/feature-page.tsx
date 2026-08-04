"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BottomRightExtras } from "@/components/bottom-right-extras-context";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryFeaturePage } from "@/components/inventory-feature-page";
import { RecipeFeaturePage } from "@/components/recipe-feature-page";
import { ShoppingFeaturePage } from "@/components/shopping-feature-page";
import { MyReceiptsSection } from "@/components/my-receipts-section";
import {
  FEATURE_PAGES,
  type FeatureSection,
  type FeatureSlug,
} from "@/lib/feature-pages";
import { cn } from "@/lib/utils";

const STATUS_VALUES = ["양호", "임박", "부족", "긴급", "보통", "정보"] as const;

function statusBadgeClass(status: string) {
  if (status === "임박" || status === "긴급") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (status === "부족") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  if (status === "보통" || status === "정보") {
    return "border-border bg-secondary text-muted-foreground";
  }
  return "border-accent/30 bg-accent/10 text-accent";
}

function StepRow({
  index,
  step,
}: {
  index: number;
  step: { title: string; description: string };
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
        {index + 1}
      </div>
      <div>
        <p className="font-medium text-foreground">{step.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
      </div>
    </div>
  );
}

function FeatureSectionBlock({ section }: { section: FeatureSection }) {
  if (section.type === "table") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
          {section.description ? (
            <CardDescription>{section.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {section.columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j}>
                      {j === row.length - 1 &&
                      (STATUS_VALUES as readonly string[]).includes(cell) ? (
                        <Badge
                          variant="outline"
                          className={cn("font-normal", statusBadgeClass(cell))}
                        >
                          {cell}
                        </Badge>
                      ) : (
                        cell
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (section.type === "steps") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
          {section.description ? (
            <CardDescription>{section.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {section.steps.map((step, i) => (
            <StepRow key={step.title} index={i} step={step} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        {section.description ? (
          <CardDescription>{section.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {section.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function FeaturePage({ slug }: { slug: FeatureSlug }) {
  if (slug === "inventory") {
    return <InventoryFeaturePage />;
  }
  if (slug === "recipes") {
    return <RecipeFeaturePage />;
  }
  if (slug === "shopping") {
    return <ShoppingFeaturePage />;
  }

  const config = FEATURE_PAGES[slug];
  const Icon = config.icon;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute top-0 right-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-accent/15 blur-[100px]" />

      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-16">
        <Link
          href="/#features"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          주요 기능으로
        </Link>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
              <Icon className="h-7 w-7 text-accent" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              {config.title}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">{config.subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {config.tagline}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/">홈으로</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {config.stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              {stat.hint ? (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {stat.hint}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {config.highlights.map((h) => (
            <Card key={h.title}>
              <CardHeader>
                <CardTitle className="text-base">{h.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {h.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 space-y-8">
          {config.sections.map((section) => (
            <FeatureSectionBlock key={section.title} section={section} />
          ))}
        </div>

        {/* 소비 패턴 분석은 영수증이 원본 근거라 이 화면에서 바로 확인할 수 있게 둔다. */}
        {slug === "analytics" ? (
          <div className="mt-12">
            <MyReceiptsSection />
          </div>
        ) : null}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          데모 화면입니다. 실제 데이터 연동은 이후 단계에서 진행합니다.
        </p>
      </div>

      <Footer />
      <BottomRightExtras />
    </main>
  );
}

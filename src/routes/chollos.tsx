import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { productsQuery, formatPrice } from "@/lib/catalog";
import { buildDeals, priceHistoryQuery } from "@/lib/content";
import { useT } from "@/hooks/useT";
import { intlLocale, type Translator, type Locale } from "@/lib/i18n";
import { useOptionalSettings } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/chollos")({
  head: () => ({
    meta: [
      { title: "Chollos y bajadas de precio en gadgets | GadgetMatrix" },
      {
        name: "description",
        content:
          "Ofertas reales: gadgets que han bajado de precio respecto a su máximo reciente, con porcentaje de descuento y enlace de compra.",
      },
      { property: "og:title", content: "Chollos y bajadas de precio | GadgetMatrix" },
      { property: "og:description", content: "Los gadgets que más han bajado de precio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealsPage,
});

/** "Revisado el 12 mar" — sin año, porque el histórico solo cubre meses. */
function formatCheckedAt(value: string | null, locale: Locale): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
  }).format(date);
}

function DealCard({
  deal,
  tr,
  locale,
}: {
  deal: ReturnType<typeof buildDeals>[number];
  tr: Translator;
  locale: Locale;
}) {
  const currency = deal.product.currency ?? "EUR";
  const checked = formatCheckedAt(deal.lastCheckedAt, locale);
  // Solo avisamos de "mínimo del periodo" si el precio actual ES el mínimo,
  // para no prometer una ganga que no lo es.
  const isLowest = deal.lowestPrice >= deal.currentPrice;

  return (
    <Link
      to="/producto/$slug"
      params={{ slug: deal.product.slug }}
      className="glow-card flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative aspect-4/3 bg-surface">
        {deal.product.image_url ? (
          <img
            src={deal.product.image_url}
            alt={deal.product.name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
        <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground">
          -{deal.discount}%
        </Badge>
        {isLowest ? (
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 bg-background/90 text-foreground"
          >
            {tr("deals", "seenAt")}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="font-display text-lg font-semibold leading-snug">{deal.product.name}</h2>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-3">
          <span className="font-display text-xl font-bold text-primary">
            {formatPrice(deal.currentPrice, currency)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(deal.previousPrice, currency)}
          </span>
        </div>
        {checked ? (
          <p className="text-xs text-muted-foreground">
            {tr("deals", "checkedAt")} {checked}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function DealsPage() {
  const tr = useT();
  const settings = useOptionalSettings();
  const locale: Locale = settings?.locale ?? "es";
  const { data: products, isLoading } = useQuery(productsQuery);
  const { data: history } = useQuery(priceHistoryQuery);
  const deals = buildDeals(products ?? [], history ?? []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
        <Flame className="size-7 text-accent" /> {tr("deals", "title")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{tr("deals", "intro")}</p>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">{tr("deals", "loading")}</p>
      ) : deals.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{tr("deals", "empty")}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <DealCard key={deal.product.id} deal={deal} tr={tr} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

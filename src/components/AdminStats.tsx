import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { buildDailySeries, buildProductTotals, eventsQuery } from "@/lib/analytics";
import type { ProductWithSpecs } from "@/lib/catalog";

const RANGES = [7, 30, 90] as const;

const COLORS = {
  view: "var(--chart-1)",
  card_click: "var(--chart-3)",
  affiliate_click: "var(--chart-2)",
};

export function AdminStats({ products }: { products: ProductWithSpecs[] }) {
  const [days, setDays] = useState<number>(30);
  const { data: events, isLoading } = useQuery(eventsQuery(days));

  const names = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products],
  );

  const daily = useMemo(() => buildDailySeries(events ?? [], days), [events, days]);
  const totals = useMemo(() => buildProductTotals(events ?? [], names), [events, names]);

  const sum = (key: "view" | "card_click" | "affiliate_click") =>
    (events ?? []).filter((event) => event.event_type === key).length;

  const views = sum("view");
  const cardClicks = sum("card_click");
  const affiliateClicks = sum("affiliate_click");
  const conversion = views > 0 ? ((affiliateClicks / views) * 100).toFixed(1) : "0.0";

  const pieData = [
    { name: "Visitas a ficha", value: views, color: COLORS.view },
    { name: "Clics en tarjeta", value: cardClicks, color: COLORS.card_click },
    { name: "Clics a Amazon", value: affiliateClicks, color: COLORS.affiliate_click },
  ].filter((entry) => entry.value > 0);

  const topProducts = totals.slice(0, 8).map((row) => ({
    ...row,
    short: row.name.length > 18 ? `${row.name.slice(0, 17)}…` : row.name,
  }));

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    color: "var(--foreground)",
    fontSize: "0.8rem",
  };

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Estadísticas de interacción</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visitas a fichas, clics en tarjetas del catálogo y clics hacia Amazon.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((range) => (
            <Button
              key={range}
              size="sm"
              variant={days === range ? "default" : "outline"}
              onClick={() => setDays(range)}
            >
              {range} días
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando datos…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visitas a fichas" value={views} />
            <StatCard label="Clics en tarjetas" value={cardClicks} />
            <StatCard label="Clics a Amazon" value={affiliateClicks} />
            <StatCard label="Conversión a Amazon" value={`${conversion}%`} />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Evolución diaria</h3>
              <div className="mt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                    <Line
                      type="monotone"
                      dataKey="view"
                      name="Visitas"
                      stroke={COLORS.view}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="card_click"
                      name="Clics tarjeta"
                      stroke={COLORS.card_click}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="affiliate_click"
                      name="Clics Amazon"
                      stroke={COLORS.affiliate_click}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Reparto por tipo</h3>
              <div className="mt-3 h-64 w-full">
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay interacciones.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground">
              Productos con más interacciones
            </h3>
            <div className="mt-3 h-72 w-full">
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay interacciones.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="short" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                    <Bar dataKey="view" name="Visitas" fill={COLORS.view} radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="card_click"
                      name="Clics tarjeta"
                      fill={COLORS.card_click}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="affiliate_click"
                      name="Clics Amazon"
                      fill={COLORS.affiliate_click}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-125 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-right">Visitas</th>
                  <th className="pb-2 text-right">Clics tarjeta</th>
                  <th className="pb-2 text-right">Clics Amazon</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2 text-right">{row.view}</td>
                    <td className="py-2 text-right">{row.card_click}</td>
                    <td className="py-2 text-right text-accent">{row.affiliate_click}</td>
                    <td className="py-2 text-right font-medium">{row.total}</td>
                  </tr>
                ))}
                {totals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground">
                      Todavía no se han registrado interacciones en este periodo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

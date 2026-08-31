import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export type EventType = "view" | "card_click" | "affiliate_click";

export const EVENT_LABELS: Record<EventType, string> = {
  view: "Visitas a la ficha",
  card_click: "Clics en tarjeta",
  affiliate_click: "Clics a Amazon",
};

/** Registra una interacción del visitante (no bloquea la UI si falla). */
export function trackEvent(productId: string, eventType: EventType) {
  void supabase
    .from("product_events")
    .insert({ product_id: productId, event_type: eventType })
    .then(() => undefined);
}

export type RawEvent = {
  product_id: string | null;
  event_type: EventType;
  created_at: string;
};

export function eventsQuery(days: number) {
  return queryOptions({
    queryKey: ["product-events", days],
    queryFn: async (): Promise<RawEvent[]> => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("product_events")
        .select("product_id, event_type, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as RawEvent[];
    },
  });
}

export function buildDailySeries(events: RawEvent[], days: number) {
  const buckets = new Map<string, { day: string; view: number; card_click: number; affiliate_click: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { day: key, view: 0, card_click: 0, affiliate_click: 0 });
  }
  for (const event of events) {
    const key = event.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket[event.event_type] += 1;
  }
  return [...buckets.values()].map((b) => ({
    ...b,
    label: new Date(`${b.day}T00:00:00Z`).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  }));
}

export function buildProductTotals(
  events: RawEvent[],
  names: Map<string, string>,
) {
  const totals = new Map<
    string,
    { id: string; name: string; view: number; card_click: number; affiliate_click: number; total: number }
  >();
  for (const event of events) {
    if (!event.product_id) continue;
    const current =
      totals.get(event.product_id) ??
      {
        id: event.product_id,
        name: names.get(event.product_id) ?? "Producto eliminado",
        view: 0,
        card_click: 0,
        affiliate_click: 0,
        total: 0,
      };
    current[event.event_type] += 1;
    current.total += 1;
    totals.set(event.product_id, current);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

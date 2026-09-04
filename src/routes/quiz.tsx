import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { productsQuery, type ProductWithSpecs } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz: encuentra tu gadget ideal | GadgetMatrix" },
      {
        name: "description",
        content:
          "Responde 3 preguntas sobre presupuesto, uso y sistema operativo y te recomendamos el gadget que mejor encaja contigo.",
      },
      { property: "og:title", content: "Quiz: encuentra tu gadget ideal | GadgetMatrix" },
      {
        property: "og:description",
        content: "Tres preguntas rápidas y te decimos qué gadget comprar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizPage,
});

type Step = { key: string; question: string; options: { value: string; label: string; hint?: string }[] };

const STEPS: Step[] = [
  {
    key: "budget",
    question: "¿Cuál es tu presupuesto?",
    options: [
      { value: "50", label: "Hasta 50 €" },
      { value: "100", label: "50 – 100 €" },
      { value: "250", label: "100 – 250 €" },
      { value: "9999", label: "Sin límite" },
    ],
  },
  {
    key: "use",
    question: "¿Para qué lo vas a usar?",
    options: [
      { value: "gaming", label: "Gaming" },
      { value: "trabajo", label: "Teletrabajo y productividad" },
      { value: "creacion", label: "Creación de contenido" },
      { value: "movilidad", label: "Día a día y movilidad" },
    ],
  },
  {
    key: "os",
    question: "¿Qué sistema operativo prefieres?",
    options: [
      { value: "windows", label: "Windows" },
      { value: "mac", label: "macOS / iOS" },
      { value: "android", label: "Android" },
      { value: "indiferente", label: "Me da igual" },
    ],
  },
];

const USE_KEYWORDS: Record<string, string[]> = {
  gaming: ["gaming", "gamer", "juego", "raton", "ratón", "auricular", "teclado", "lightspeed"],
  trabajo: ["teletrabajo", "oficina", "productividad", "webcam", "monitor", "teclado", "hub"],
  creacion: ["stream", "creador", "micro", "cámara", "camara", "captura", "deck", "edición"],
  movilidad: ["portátil", "portatil", "inalámbrico", "inalambrico", "batería", "bateria", "ligero", "usb-c"],
};

const OS_KEYWORDS: Record<string, string[]> = {
  windows: ["windows", "pc"],
  mac: ["mac", "ios", "apple"],
  android: ["android"],
  indiferente: [],
};

function scoreProduct(product: ProductWithSpecs, answers: Record<string, string>): number {
  const haystack = [
    product.name,
    product.brand ?? "",
    product.short_description,
    product.description,
    product.categories?.name ?? "",
    ...product.pros,
    ...(product.product_specs ?? []).map((s) => `${s.label} ${s.value}`),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const budget = Number(answers["budget"] ?? "9999");
  if (product.price != null) {
    if (product.price <= budget) score += 3;
    else if (product.price <= budget * 1.2) score += 1;
    else score -= 3;
  }
  for (const kw of USE_KEYWORDS[answers["use"] ?? ""] ?? []) {
    if (haystack.includes(kw)) score += 2;
  }
  for (const kw of OS_KEYWORDS[answers["os"] ?? ""] ?? []) {
    if (haystack.includes(kw)) score += 1;
  }
  if (product.rating != null) score += product.rating / 2;
  if (product.featured) score += 0.5;
  return score;
}

function QuizPage() {
  const { data: products } = useQuery(productsQuery);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const done = step >= STEPS.length;
  const results = done
    ? [...(products ?? [])]
        .map((p) => ({ p, score: scoreProduct(p, answers) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((r) => r.p)
    : [];

  function choose(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setStep((s) => s + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">¿Qué gadget necesitas?</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Tres preguntas rápidas y te proponemos los productos de nuestro catálogo que mejor encajan
        con tu presupuesto y tu forma de usarlos.
      </p>

      <div className="mt-6 flex gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      {!done ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Pregunta {step + 1} de {STEPS.length}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">{STEPS[step]!.question}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {STEPS[step]!.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(STEPS[step]!.key, option.value)}
                className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:text-primary"
              >
                {option.label}
              </button>
            ))}
          </div>
          {step > 0 ? (
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setStep((s) => s - 1)}>
              Volver
            </Button>
          ) : null}
        </section>
      ) : (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Nuestra recomendación</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAnswers({});
                setStep(0);
              }}
            >
              <RotateCcw className="size-4" /> Repetir quiz
            </Button>
          </div>
          {results.length === 0 ? (
            <p className="mt-6 text-muted-foreground">
              Todavía no hay productos suficientes en el catálogo para recomendarte nada.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

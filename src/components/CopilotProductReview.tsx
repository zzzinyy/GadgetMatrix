import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/lib/catalog";
import { validateProduct, type ProductDraft } from "../../supabase/functions/_shared/product-draft";

export function CopilotProductReview({
  draft,
  categories,
  disabled,
  onChange,
  onPublish,
  onDiscard,
}: {
  draft: ProductDraft;
  categories: Category[];
  disabled: boolean;
  onChange: (draft: ProductDraft) => void;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  let error = "";
  try {
    validateProduct(draft, true);
  } catch (e) {
    error = (e as Error).message;
  }
  const update = (patch: Partial<ProductDraft>) => {
    setConfirmed(false);
    onChange({ ...draft, ...patch });
  };
  return (
    <fieldset disabled={disabled} className="mt-6 space-y-4 rounded-lg border border-border p-4">
      <legend className="px-2 font-semibold">Propuesta — todavía no publicada</legend>
      <p className="text-sm text-muted-foreground">
        Revisa los datos y los enlaces. La IA no ha consultado Amazon ni probado este producto. Los
        campos vacíos no se completarán con datos inventados.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["name", "Nombre"],
            ["slug", "Slug"],
            ["brand", "Marca"],
            ["amazon_url", "URL de Amazon"],
            ["image_url", "URL de imagen"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <Input value={draft[key]} onChange={(e) => update({ [key]: e.target.value })} />
          </label>
        ))}
        <label className="text-sm">
          Categoría
          <select
            className="block w-full rounded border border-border bg-background p-2"
            value={draft.category_id ?? ""}
            onChange={(e) => update({ category_id: e.target.value || null })}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {(
          [
            ["price", "Precio (EUR)", 1000000],
            ["rating", "Valoración (0–5)", 5],
          ] as const
        ).map(([key, label, max]) => (
          <label key={key} className="text-sm">
            {label}
            <Input
              type="number"
              min={0}
              max={max}
              step="0.01"
              value={draft[key] ?? ""}
              onChange={(e) =>
                update({ [key]: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      {(
        [
          ["short_description", "Descripción corta", 200],
          ["description", "Análisis completo", 5000],
        ] as const
      ).map(([key, label, max]) => (
        <label key={key} className="block text-sm">
          {label}
          <Textarea
            maxLength={max}
            rows={key === "description" ? 6 : 2}
            value={draft[key]}
            onChange={(e) => update({ [key]: e.target.value })}
          />
        </label>
      ))}
      {(["pros", "cons"] as const).map((key) => (
        <label key={key} className="block text-sm">
          {key === "pros" ? "Pros" : "Contras"} (uno por línea)
          <Textarea
            value={draft[key].join("\n")}
            onChange={(e) => update({ [key]: e.target.value.split("\n") })}
          />
        </label>
      ))}
      <div className="space-y-2">
        <p className="text-sm">Ficha técnica</p>
        {draft.specs.map((spec, i) => (
          <div key={i} className="flex gap-2">
            <Input
              aria-label={`Característica ${i + 1}`}
              value={spec.label}
              onChange={(e) =>
                update({
                  specs: draft.specs.map((s, n) => (n === i ? { ...s, label: e.target.value } : s)),
                })
              }
            />
            <Input
              aria-label={`Valor ${i + 1}`}
              value={spec.value}
              onChange={(e) =>
                update({
                  specs: draft.specs.map((s, n) => (n === i ? { ...s, value: e.target.value } : s)),
                })
              }
            />
            <Button
              variant="outline"
              onClick={() => update({ specs: draft.specs.filter((_, n) => n !== i) })}
            >
              Quitar
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          disabled={draft.specs.length >= 50}
          onClick={() => update({ specs: [...draft.specs, { label: "", value: "" }] })}
        >
          Añadir característica
        </Button>
      </div>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.featured}
          onChange={(e) => update({ featured: e.target.checked })}
        />
        Destacar en portada
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        He revisado esta ficha y quiero publicarla en la web.
      </label>
      <div className="flex gap-2">
        <Button disabled={disabled || !confirmed || !!error} onClick={onPublish}>
          Publicar producto
        </Button>
        <Button variant="outline" onClick={onDiscard}>
          Descartar propuesta
        </Button>
      </div>
    </fieldset>
  );
}

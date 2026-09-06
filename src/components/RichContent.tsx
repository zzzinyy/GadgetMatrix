import type { ReactNode } from "react";

/** Renderiza texto con formato sencillo (títulos, listas, citas, negritas, enlaces e imágenes). */
export function RichContent({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;

  function flushList() {
    if (list.length === 0) return;
    const items = list.map((item, i) => (
      <li key={i} className="marker:text-primary">
        {inline(item)}
      </li>
    ));
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="my-5 list-decimal space-y-2 pl-6 text-foreground/90">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="my-5 list-disc space-y-2 pl-6 text-foreground/90">
          {items}
        </ul>
      ),
    );
    list = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      if (ordered) flushList();
      ordered = false;
      list.push(bullet[1] ?? "");
      continue;
    }
    if (numbered) {
      if (!ordered) flushList();
      ordered = true;
      list.push(numbered[1] ?? "");
      continue;
    }
    flushList();

    if (trimmed === "") continue;

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      blocks.push(<hr key={blocks.length} className="my-8 border-border" />);
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (image) {
      blocks.push(
        <figure key={blocks.length} className="my-8">
          <img
            src={image[2]}
            alt={image[1] || ""}
            loading="lazy"
            className="w-full rounded-2xl border border-border object-cover"
          />
          {image[1] ? (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {image[1]}
            </figcaption>
          ) : null}
        </figure>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const content = inline(heading[2] ?? "");
      const cls =
        level <= 2
          ? "mt-10 mb-3 font-display text-2xl font-bold text-foreground"
          : level === 3
            ? "mt-8 mb-2 font-display text-xl font-semibold text-primary"
            : "mt-6 mb-2 font-display text-lg font-semibold text-accent";
      blocks.push(
        level <= 2 ? (
          <h2 key={blocks.length} className={cls}>
            {content}
          </h2>
        ) : level === 3 ? (
          <h3 key={blocks.length} className={cls}>
            {content}
          </h3>
        ) : (
          <h4 key={blocks.length} className={cls}>
            {content}
          </h4>
        ),
      );
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      blocks.push(
        <blockquote
          key={blocks.length}
          className="my-6 rounded-r-xl border-l-4 border-accent bg-accent/10 px-5 py-4 text-foreground/90 italic"
        >
          {inline(quote[1] ?? "")}
        </blockquote>,
      );
      continue;
    }

    blocks.push(
      <p key={blocks.length} className="my-4 text-[1.05rem] leading-8 text-foreground/85">
        {inline(trimmed)}
      </p>,
    );
  }
  flushList();

  return <div className={className}>{blocks}</div>;
}

/** Formato en línea: **negrita**, *cursiva*, `código` y [enlaces](url). */
function inline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  const parts = text.split(pattern).filter((part) => part !== "");
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-accent">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-4 hover:text-accent"
        >
          {link[1]}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

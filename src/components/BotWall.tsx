import { useCallback, useEffect, useRef, useState } from "react";
import { Cpu, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { codeMatches, generateCode, markVerified, sessionStorageLike } from "@/lib/botwall";

/** Dibuja el reto en el canvas: caracteres rotados + ruido, a lo Amazon. */
function drawChallenge(canvas: HTMLCanvasElement, code: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = 280;
  const cssHeight = 96;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fondo con motas, como el CAPTCHA de Amazon.
  ctx.fillStyle = "#f4f4f8";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(30, 30, 60, ${Math.random() * 0.14})`;
    ctx.fillRect(Math.random() * cssWidth, Math.random() * cssHeight, 1.6, 1.6);
  }

  const palette = ["#1e3a8a", "#7c2d12", "#14532d", "#4c1d95", "#831843"];
  const slot = cssWidth / code.length;
  for (let i = 0; i < code.length; i++) {
    ctx.save();
    ctx.translate(slot * i + slot / 2, cssHeight / 2 + (Math.random() * 12 - 6));
    ctx.rotate((Math.random() - 0.5) * 0.7);
    ctx.font = `700 ${30 + Math.random() * 8}px "Space Grotesk", Georgia, serif`;
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(code[i], 0, 0);
    ctx.restore();
  }

  // Trazos que cruzan el texto para dificultar el OCR básico.
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(20, 20, 50, ${0.25 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(Math.random() * cssWidth, Math.random() * cssHeight);
    ctx.bezierCurveTo(
      Math.random() * cssWidth,
      Math.random() * cssHeight,
      Math.random() * cssWidth,
      Math.random() * cssHeight,
      Math.random() * cssWidth,
      Math.random() * cssHeight,
    );
    ctx.stroke();
  }
}

/**
 * Muro antibot: exige resolver el reto de caracteres antes de continuar.
 * Se muestra en sustitución del contenido cuando la heurística lo pide.
 */
export function BotWall({ onPass }: { onPass: () => void }) {
  const tr = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState(() => generateCode());
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (canvasRef.current) drawChallenge(canvasRef.current, code);
    setValue("");
    setError(false);
    inputRef.current?.focus();
  }, [code]);

  const verify = useCallback(() => {
    if (codeMatches(value, code)) {
      markVerified(Date.now(), sessionStorageLike());
      onPass();
    } else {
      setError(true);
      inputRef.current?.select();
    }
  }, [code, onPass, value]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Cpu className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Gadget<span className="text-gradient">Matrix</span>
          </span>
        </div>
        <h1 className="mt-6 font-display text-xl font-bold text-foreground">
          {tr("botwall", "title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {tr("botwall", "reason")}
        </p>

        <div className="mt-6">
          <canvas
            ref={canvasRef}
            aria-label={tr("botwall", "imageAlt")}
            role="img"
            className="rounded-md border border-border"
          />
          <button
            type="button"
            onClick={() => setCode(generateCode())}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {tr("botwall", "newCode")}
          </button>
        </div>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            verify();
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(false);
            }}
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error}
            aria-describedby={error ? "botwall-error" : undefined}
            placeholder={tr("botwall", "placeholder")}
            className={cn(
              "h-11 rounded-md border bg-background px-3 text-base tracking-[0.3em] uppercase outline-none transition-colors placeholder:tracking-normal placeholder:normal-case placeholder:text-muted-foreground",
              error ? "border-destructive" : "border-border focus:border-primary",
            )}
          />
          {error ? (
            <p id="botwall-error" role="alert" className="text-sm text-destructive">
              {tr("botwall", "error")}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={value.trim().length === 0}>
            {tr("botwall", "continue")}
          </Button>
        </form>
      </div>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sobre-nosotros")({
  head: () => ({
    meta: [
      { title: "Cómo analizamos los gadgets | GadgetMatrix" },
      {
        name: "description",
        content:
          "Nuestro método de análisis, cómo elaboramos las fichas técnicas y cómo funciona nuestro programa de afiliados de Amazon.",
      },
      { property: "og:title", content: "Cómo analizamos los gadgets | GadgetMatrix" },
      {
        property: "og:description",
        content: "Método de análisis, fichas técnicas y transparencia de afiliación.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Sobre GadgetMatrix</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Somos un equipo pequeño obsesionado con la tecnología de consumo. Publicamos fichas técnicas
        detalladas y opiniones honestas para que elijas sin perder horas comparando pestañas.
      </p>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold">Nuestro método</h2>
          <p className="mt-2 text-muted-foreground">
            Cada producto se documenta con sus especificaciones oficiales, se contrasta con pruebas
            de uso real y se resume en pros y contras. Las fichas viven en nuestra propia base de
            datos, así que se actualizan cuando cambian precios o especificaciones.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold">Transparencia de afiliación</h2>
          <p className="mt-2 text-muted-foreground">
            Los botones de compra llevan nuestro identificador de afiliado de Amazon. Si compras a
            través de ellos, recibimos una pequeña comisión sin coste adicional para ti. Eso nunca
            condiciona la valoración de un producto.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold">Precios</h2>
          <p className="mt-2 text-muted-foreground">
            Los precios mostrados son orientativos y pueden variar. El precio válido siempre es el
            que aparece en Amazon en el momento de la compra.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Button asChild>
          <Link to="/productos">Ver el catálogo</Link>
        </Button>
      </div>
    </div>
  );
}

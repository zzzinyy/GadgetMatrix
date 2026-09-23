import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://zzzinyy.github.io/GadgetMatrix";

export const Route = createFileRoute("/aviso-legal")({
  head: () => ({
    meta: [
      { title: "Aviso legal | GadgetMatrix" },
      {
        name: "description",
        content: "Información legal del sitio GadgetMatrix: titularidad, alojamiento y descargo de afiliados.",
      },
      { name: "robots", content: "index" },
    ],
  }),
  component: AvisoLegalPage,
});

function AvisoLegalPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Aviso legal</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: 22 de septiembre de 2026.</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">1. Titularidad</h2>
        <p>
          Este sitio web, GadgetMatrix (en adelante, el «Sitio»), es de titularidad privada. Para
          cualquier asunto relacionado con el Sitio —incluidos derechos sobre datos personales—
          puedes contactar por correo electrónico en{" "}
          <a href="mailto:ziny967@gmail.com" className="text-primary hover:underline">
            ziny967@gmail.com
          </a>{" "}
          o a través de la página{" "}
          <a href={`${SITE_URL}/sobre-nosotros`} className="text-primary hover:underline">
            Sobre nosotros
          </a>.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">2. Objeto</h2>
        <p>
          El Sitio es un portal de información y divulgación sobre tecnología de consumo: fichas
          técnicas, análisis, comparativas, ofertas y otros contenidos editoriales. El acceso y uso
          del Sitio implica la aceptación de estas condiciones.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">3. Alojamiento</h2>
        <p>
          El Sitio se aloja en GitHub Pages, con dominio{" "}
          <code className="text-foreground">zzzinyy.github.io</code>, y utiliza los servicios de
          Google Firebase (Supabase) para autenticación y base de datos. Los datos del proveedor de
          alojamiento se encuentran en la{" "}
          <a
            href="https://docs.github.com/en/site-policy"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary hover:underline"
          >
            documentación legal de GitHub
          </a>
          .
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          4. Propiedad intelectual
        </h2>
        <p>
          Todos los contenidos propios del Sitio (textos, análisis, fotografías propias, diseño,
          marca GadgetMatrix y código) están protegidos por la normativa de propiedad intelectual e
          industrial. No se permite su reproducción total o parcial sin autorización, salvo uso
          personal y no comercial. Las marcas, nombres de producto e imágenes de terceros (Amazon,
          fabricantes) pertenecen a sus respectivos titulares y se usan únicamente con fines
          informativos y descriptivos.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">5. Descargo de afiliados</h2>
        <p>
          El Sitio participa en el Programa de Afiliados de Amazon Europe. Algunos enlaces de compra
          son enlaces de afiliado: si compras a través de ellos, el Sitio recibe una comisión sin
          coste adicional para ti. Los precios mostrados pueden diferir de los precios vigentes en
          Amazon.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">6. Exención de responsabilidad</h2>
        <p>
          Los contenidos se publican con fines informativos y pueden contener errores u
          obsolescencia: verifica siempre las características, disponibilidad y precio en la web del
          fabricante o comerciante antes de comprar. GadgetMatrix no fabrica ni vende los productos
          mencionados.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">7. Protección de datos</h2>
        <p>
          El tratamiento de datos personales y el uso de cookies se detallan en la{" "}
          <a href={`${SITE_URL}/privacidad`} className="text-primary hover:underline">
            Política de privacidad
          </a>.
        </p>
      </section>
    </article>
  );
}
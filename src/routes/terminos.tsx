import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://zzzinyy.github.io/GadgetMatrix";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y condiciones | GadgetMatrix" },
      {
        name: "description",
        content:
          "Condiciones de uso del sitio GadgetMatrix: registro de cuenta, moderación, límites de responsabilidad y legislación aplicable.",
      },
      { name: "robots", content: "index" },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Términos y condiciones</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: 22 de septiembre de 2026.</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">1. Aceptación</h2>
        <p>
          El acceso y la utilización de GadgetMatrix (en adelante, el «Sitio») atribuyen la
          condición de usuario y suponen la aceptación plena de estos Términos y condiciones. Si no
          estás de acuerdo, no utilices el Sitio.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">2. Condiciones de uso</h2>
        <p>El usuario se compromete a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hacer un uso diligente y lícito del Sitio.</li>
          <li>No intentar acceder a áreas restringidas, como el panel de administración.</li>
          <li>No utilizar el Sitio para actividades ilícitas o que dañen a terceros.</li>
          <li>No realizar accesos automatizados masivos (scraping) al Sitio o a su API.</li>
        </ul>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">3. Cuentas de usuario</h2>
        <p>
          El registro es gratuito. El usuario es responsable de la custodia de sus credenciales y de
          toda la actividad realizada desde su cuenta. Podemos suspender cuentas que incumplan estos
          términos o las políticas aplicables.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          4. Contenido y recomendaciones
        </h2>
        <p>
          Los análisis, comparativas y fichas técnicas son opiniones informativas y no constituyen
          asesoramiento profesional ni garantía de idoneidad para un fin concreto. Los precios,
          disponibilidad y especificaciones varían con el tiempo; prevalece siempre la información
          publicada por el fabricante o comerciante.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          5. Enlaces externos y publicidad
        </h2>
        <p>
          El Sitio contiene enlaces a webs de terceros (Amazon, fabricantes, YouTube) y publicidad de
          terceros (Google AdSense). No controlamos esos contenidos y no somos responsables de ellos.
          La contratación con terceros se rige por sus propias condiciones.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">6. Exención de responsabilidad</h2>
        <p>
          El Sitio se presta «tal cual». No garantizamos la disponibilidad ininterrumpida del Sitio
          ni la verificación permanente de todos los datos publicados. En la máxima medida permitida
          por la ley, no seremos responsables de daños derivados de la imposibilidad de acceso o del
          uso del Sitio o de sus contenidos.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">7. Modificaciones</h2>
        <p>
          Podemos modificar estos términos en cualquier momento. La versión vigente será siempre la
          publicada en esta página, con su fecha de actualización.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">8. Legislación aplicable</h2>
        <p>
          Estos términos se rigen por la legislación española. Para cualquier controversia serán
          competentes los juzgados y tribunales que correspondan conforme a la normativa de
          consumidores y usuarios.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">9. Contacto</h2>
        <p>
          Para cualquier consulta, visita{" "}
          <a href={`${SITE_URL}/sobre-nosotros`} className="text-primary hover:underline">
            Sobre nosotros
          </a>
          , o consulta la{" "}
          <a href={`${SITE_URL}/privacidad`} className="text-primary hover:underline">
            Política de privacidad
          </a>
          .
        </p>
      </section>
    </article>
  );
}
import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://zzzinyy.github.io/GadgetMatrix";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad | GadgetMatrix" },
      {
        name: "description",
        content:
          "Cómo recogemos y tratamos tus datos en GadgetMatrix: cookies, Supabase, Google AdSense, enlaces de Amazon y tus derechos RGPD.",
      },
      { name: "robots", content: "index" },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: 22 de septiembre de 2026.
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Esta Política de Privacidad explica qué datos recoge GadgetMatrix (en adelante, el
          «Sitio»), con qué finalidad los utiliza y qué derechos tienes sobre ellos. Al
          utilizar el Sitio aceptas las prácticas descritas aquí.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          1. Responsable del tratamiento
        </h2>
        <p>
          El responsable del Sitio es su titular. Puedes contactar por cualquier cuestión
          relativa a datos personales a través de la página{" "}
          <a href={`${SITE_URL}/sobre-nosotros`} className="text-primary hover:underline">
            Sobre nosotros
          </a>{" "}
          o del correo indicado en el{" "}
          <a href={`${SITE_URL}/aviso-legal`} className="text-primary hover:underline">
            Aviso legal
          </a>.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          2. Datos que recogemos
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Cuenta de usuario:</strong> si te registramos, almacenamos tu correo
            electrónico y proveedor de autenticación en Supabase. No guardamos contraseñas
            propias: el acceso se gestiona mediante el proveedor.
          </li>
          <li>
            <strong>Preferencias locales:</strong> idioma, tema (claro/oscuro), favoritos e
            historial de productos se guardan en el almacenamiento local de tu navegador.
            Estos datos no salen de tu dispositivo ni te identifican.
          </li>
          <li>
            <strong>Interacciones de producto:</strong> registramos visitas a fichas y clics
            en enlaces de compra de forma agregada y anónima, para medir el rendimiento del
            catálogo.
          </li>
          <li>
            <strong>Datos de navegación:</strong> el proveedor de alojamiento (GitHub Pages)
            y los terceros indicados abajo pueden recoger datos técnicos como IP, navegador
            o páginas visitadas.
          </li>
        </ul>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          3. Cookies y tecnologías similares
        </h2>
        <p>El Sitio utiliza:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Cookies propias imprescindibles:</strong> sesión de usuario y
            preferencias. No requieren consentimiento.
          </li>
          <li>
            <strong>Cookies de terceros con fines publicitarios:</strong> Google AdSense
            utiliza cookies para mostrar anuncios relevantes y medir su rendimiento, y en su
            caso personalizarlos según tu historial. Puedes{" "}
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary hover:underline"
            >
              gestionar tus anuncios de Google
            </a>{" "}
            o{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary hover:underline"
            >
              desactivar la personalización
            </a>.
          </li>
          <li>
            <strong>Enlaces de Amazon:</strong> al salir hacia Amazon, Amazon puede instalar
            sus propias cookies de afiliado para acreditar la venta.
          </li>
        </ul>
        <p>
          Puedes aceptar o rechazar las cookies no esenciales desde el aviso de cookies, y
          borrarlas en cualquier momento desde la configuración de tu navegador.
        </p>
      </section>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          4. Google AdSense y anuncios
        </h2>
        <p>
          El Sitio colabora con Google AdSense para mostrar anuncios. Google, como proveedor
          externo, utiliza cookies (incluida la cookie DART) para publicar anuncios según tus
          visitas anteriores a este u otros sitios web. Los datos tratados por Google se
          rigen por su{" "}
          <a
            href="https://policies.google.com/privacy?hl=es"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary hover:underline"
          >
            Política de privacidad
          </a>{" "}
          y por su{" "}
          <a
            href="https://policies.google.com/technologies/ads?hl=es"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary hover:underline"
          >
            información sobre cookies en la publicidad
          </a>
          .
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          5. Enlaces de afiliación
        </h2>
        <p>
          Los botones de compra conducen a Amazon con la etiqueta de afiliado del Sitio.
          Amazon puede tratar tus datos conforme a su{" "}
          <a
            href="https://www.amazon.es/gp/help/customer/display.html?nodeId=201910040"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary hover:underline"
          >
            Política de privacidad
          </a>
          . GadgetMatrix no recibe ningún dato personal por esas navegaciones.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          6. Base jurídica y conservación
        </h2>
        <p>
          Las cookies esenciales se tratan por interés legítimo; las de personalización y
          publicidad, con tu consentimiento, que puedes retirar en cualquier momento.
          Conservamos los datos de cuenta mientras esta exista.
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          7. Tus derechos (RGPD)
        </h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición,
          limitación y portabilidad escribiéndonos desde Sobre nosotros. También tienes
          derecho a reclamar ante la Agencia Española de Protección de Datos (
          <a
            href="https://www.aepd.es"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary hover:underline"
          >
            www.aepd.es
          </a>
          ).
        </p>

        <h2 className="pt-4 font-display text-lg font-semibold text-foreground">
          8. Cambios en esta política
        </h2>
        <p>
          Podemos actualizar esta política para reflejar cambios normativos o del Sitio. La
          fecha de la última actualización aparece al principio de la página.
        </p>
      </section>
    </article>
  );
}
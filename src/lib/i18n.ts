/**
 * Idioma de la interfaz (español por defecto, inglés opt-in). Solo cubre los
 * textos propios de la UI que no vienen de la base de datos (cabecera,
 * buscador, botones comunes); el contenido editorial sigue en español.
 */

export const LOCALE_KEY = "gadgetmatrix:locale";
export type Locale = "es" | "en";

const STRINGS = {
  nav: {
    home: { es: "Inicio", en: "Home" },
    products: { es: "Productos", en: "Products" },
    comparator: { es: "Comparador", en: "Compare" },
    quiz: { es: "Quiz", en: "Quiz" },
    tops: { es: "Top", en: "Top" },
    deals: { es: "Chollos", en: "Deals" },
    blog: { es: "Blog", en: "Blog" },
  },
  common: {
    loading: { es: "Cargando…", en: "Loading…" },
    back: { es: "Volver", en: "Back" },
    clear: { es: "Limpiar", en: "Clear" },
    all: { es: "Todas", en: "All" },
    seeAll: { es: "Ver todo", en: "See all" },
    dash: { es: "—", en: "—" },
    product: { es: "producto", en: "product" },
    products: { es: "productos", en: "products" },
    by: { es: "por", en: "by" },
    updated: { es: "Actualizado", en: "Updated" },
  },
  header: {
    navAria: { es: "Navegación principal", en: "Main navigation" },
    menuAria: { es: "Abrir menú de cuenta", en: "Open account menu" },
  },
  brand: {
    tagline: {
      es: "Análisis y fichas técnicas de tecnología y gadgets, con enlaces de compra en Amazon.",
      en: "Reviews and spec sheets for tech and gadgets, with Amazon shopping links.",
    },
  },
  search: {
    button: { es: "Buscar…", en: "Search…" },
    placeholder: { es: "Busca productos, artículos, tops…", en: "Search products, posts, tops…" },
    empty: { es: "Escribe para buscar en todo el sitio.", en: "Type to search the whole site." },
    noResults: {
      es: "Sin resultados. Prueba con otra palabra.",
      en: "No results. Try another word.",
    },
    buttonLabel: { es: "Abrir buscador", en: "Open search" },
    dialogLabel: { es: "Resultados de búsqueda", en: "Search results" },
    commandLabel: { es: "Comandos de búsqueda", en: "Search commands" },
    inputLabel: { es: "Término de búsqueda", en: "Search term" },
    noResultsFor: {
      es: "Sin resultados para \"{term}\". Prueba con otra palabra.",
      en: "No results for \"{term}\". Try another word.",
    },
  },
  searchGroups: {
    products: { es: "Productos", en: "Products" },
    posts: { es: "Artículos", en: "Articles" },
    lists: { es: "Tops", en: "Tops" },
    pages: { es: "Páginas", en: "Pages" },
  },
  homeExtras: {
    recent: { es: "Vistos recientemente", en: "Recently viewed" },
    recentCta: { es: "Ver todos los productos", en: "View all products" },
  },
  headerExtras: {
    favorites: { es: "Tus favoritos", en: "Your favorites" },
  },
  botwall: {
    title: {
      es: "Escribe los caracteres que veas abajo",
      en: "Type the characters you see below",
    },
    reason: {
      es: "Hemos detectado actividad inusual desde tu navegador y necesitamos comprobar que no eres un robot. Es un paso rápido: introduce los caracteres de la imagen para continuar.",
      en: "We've detected unusual activity from your browser and need to check that you're not a robot. It's quick: enter the characters from the image to continue.",
    },
    continue: { es: "Continuar a GadgetMatrix", en: "Continue to GadgetMatrix" },
    placeholder: { es: "Escribe los caracteres", en: "Type the characters" },
    imageAlt: {
      es: "Imagen de verificación con seis caracteres distorsionados",
      en: "Verification image with six distorted characters",
    },
    newCode: { es: "Generar otros caracteres", en: "Generate new characters" },
    error: {
      es: "Los caracteres no coinciden. Vuelve a intentarlo.",
      en: "The characters don't match. Please try again.",
    },
  },
  favorites: {
    add: { es: "Guardar en favoritos", en: "Save to favorites" },
    remove: { es: "Quitar de favoritos", en: "Remove from favorites" },
    title: { es: "Favoritos", en: "Favorites" },
    empty: {
      es: "Aún no tienes favoritos. Toca el corazón de cualquier producto.",
      en: "No favorites yet. Tap the heart on any product.",
    },
  },
  history: {
    title: { es: "Vistos recientemente", en: "Recently viewed" },
    clear: { es: "Borrar historial", en: "Clear history" },
  },
  theme: {
    toLight: { es: "Cambiar a modo claro", en: "Switch to light mode" },
    toDark: { es: "Cambiar a modo oscuro", en: "Switch to dark mode" },
  },
  language: { es: "Idioma", en: "Language" },
  footer: {
    navTitle: { es: "Navegación", en: "Navigation" },
    allProducts: { es: "Todos los productos", en: "All products" },
    about: { es: "Sobre nosotros", en: "About us" },
    adminAccess: { es: "Acceso administrador", en: "Admin access" },
    affiliateTitle: { es: "Aviso de afiliados", en: "Affiliate disclosure" },
    affiliateText: {
      es: "En calidad de Afiliado de Amazon, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables. Los precios pueden variar respecto a los mostrados.",
      en: "As an Amazon Associate we earn from qualifying purchases. Prices may differ from those shown.",
    },
    rights: { es: "Todos los derechos reservados.", en: "All rights reserved." },
  },
  notFound: {
    code: { es: "Error 404", en: "Error 404" },
    title: { es: "Esta página no existe", en: "This page does not exist" },
    text: {
      es: "Puede que el enlace esté mal escrito, que el producto ya no esté en el catálogo o que la página se haya movido. Te dejamos algunos atajos para seguir explorando.",
      en: "The link may be misspelled, the product may no longer be in the catalog, or the page may have moved. Here are some shortcuts to keep exploring.",
    },
    catalog: { es: "Catálogo de productos", en: "Product catalog" },
    dealsLink: { es: "Chollos del día", en: "Today's deals" },
    backHome: { es: "Volver al inicio", en: "Back to home" },
    errorTitle: { es: "Esta página no ha cargado", en: "This page failed to load" },
    errorText: {
      es: "Ha fallado algo por nuestra parte. Vuelve a intentarlo o regresa al inicio.",
      en: "Something on our side went wrong. Try again or head back home.",
    },
    retry: { es: "Reintentar", en: "Try again" },
  },
  home: {
    badge: { es: "Tecnología y gadgets", en: "Tech and gadgets" },
    title: { es: "Elige bien tu próximo", en: "Choose your next" },
    titleHighlight: { es: "gadget", en: "gadget" },
    intro: {
      es: "Analizamos auriculares, portátiles, smartwatches y accesorios. Fichas técnicas completas, pros y contras, y el enlace directo para comprarlos en Amazon.",
      en: "We review headphones, laptops, smartwatches and accessories. Full spec sheets, pros and cons, and a direct link to buy them on Amazon.",
    },
    ctaCatalog: { es: "Ver catálogo", en: "Browse catalog" },
    ctaHow: { es: "Cómo analizamos", en: "How we review" },
    heroAlt: {
      es: "Auriculares, portátil, smartwatch y teclado mecánico sobre fondo oscuro",
      en: "Headphones, laptop, smartwatch and mechanical keyboard on a dark background",
    },
    pricesTitle: { es: "Precios claros", en: "Clear prices" },
    pricesText: {
      es: "Precio de referencia y enlace de afiliado actualizado a Amazon.",
      en: "Reference price and an affiliate link kept up to date with Amazon.",
    },
    specsTitle: { es: "Fichas técnicas", en: "Spec sheets" },
    specsText: {
      es: "Cada producto con sus especificaciones detalladas en base de datos.",
      en: "Every product with its detailed specifications stored in our database.",
    },
    prosTitle: { es: "Pros y contras", en: "Pros and cons" },
    prosText: {
      es: "Lo bueno y lo mejorable, sin rodeos, antes de que compres.",
      en: "The good and the improvable, straight to the point, before you buy.",
    },
    featured: { es: "Destacados", en: "Featured" },
    latest: { es: "Últimos análisis", en: "Latest reviews" },
  },
  deals: {
    title: { es: "Chollos", en: "Deals" },
    intro: {
      es: "Seguimos el histórico de precios de cada gadget y te mostramos las bajadas reales frente a su máximo reciente.",
      en: "We track each gadget's price history and show the real drops against its recent high.",
    },
    loading: { es: "Buscando ofertas…", en: "Looking for deals…" },
    empty: {
      es: "Ahora mismo no hay bajadas de precio. Vuelve pronto o crea una alerta desde la ficha del producto.",
      en: "There are no price drops right now. Come back soon or set an alert from the product page.",
    },
    seenAt: { es: "Precio mínimo registrado", en: "Lowest recorded price" },
    checkedAt: { es: "Revisado", en: "Checked" },
    wasPrice: { es: "Antes", en: "Was" },
  },
  products: {
    title: { es: "Catálogo", en: "Catalog" },
    intro: {
      es: "productos con ficha técnica completa y enlace de compra en Amazon.",
      en: "products with a full spec sheet and an Amazon shopping link.",
    },
    searchPlaceholder: { es: "Buscar producto o marca…", en: "Search product or brand…" },
    brand: { es: "Marca", en: "Brand" },
    allBrands: { es: "Todas las marcas", en: "All brands" },
    maxPrice: { es: "Precio máx. (€)", en: "Max price (€)" },
    rating: { es: "Valoración", en: "Rating" },
    anyRating: { es: "Cualquier valoración", en: "Any rating" },
    rating3: { es: "3★ o más", en: "3★ or more" },
    rating4: { es: "4★ o más", en: "4★ or more" },
    rating45: { es: "4,5★ o más", en: "4.5★ or more" },
    sort: { es: "Ordenar", en: "Sort" },
    sortRecent: { es: "Más recientes", en: "Most recent" },
    sortPriceAsc: { es: "Precio: menor a mayor", en: "Price: low to high" },
    sortPriceDesc: { es: "Precio: mayor a menor", en: "Price: high to low" },
    sortRating: { es: "Mejor valorados", en: "Best rated" },
    clearFilters: { es: "Limpiar filtros", en: "Clear filters" },
    loading: { es: "Cargando productos…", en: "Loading products…" },
    empty: {
      es: "No hay productos que coincidan con tu búsqueda.",
      en: "No products match your search.",
    },
    cardCta: { es: "Ver ficha", en: "View details" },
    featuredBadge: { es: "Destacado", en: "Featured" },
    gadgetFallback: { es: "Gadget", en: "Gadget" },
    savedTitle: { es: "Tus favoritos", en: "Your favorites" },
    savedEmpty: {
      es: "Toca el corazón de un producto para guardarlo aquí.",
      en: "Tap the heart on a product to save it here.",
    },
  },
  comparator: {
    title: { es: "Comparador de gadgets", en: "Gadget comparator" },
    intro: {
      es: "Hasta 3 productos enfrentados en una sola tabla: precio, valoración, categoría, pros, contras y ficha técnica completa.",
      en: "Up to 3 products side by side in a single table: price, rating, category, pros, cons and the full spec sheet.",
    },
    selected: { es: "seleccionados", en: "selected" },
    searchPlaceholder: { es: "Buscar producto…", en: "Search product…" },
    clear: { es: "Vaciar", en: "Clear" },
    empty: {
      es: "Elige al menos 2 productos arriba para ver la comparativa.",
      en: "Pick at least 2 products above to see the comparison.",
    },
    category: { es: "Categoría", en: "Category" },
    summary: { es: "Resumen", en: "Summary" },
    pros: { es: "A favor", en: "Pros" },
    cons: { es: "En contra", en: "Cons" },
    buy: { es: "Ver en Amazon", en: "View on Amazon" },
    bestPrice: { es: "Mejor precio", en: "Best price" },
    bestRating: { es: "Mejor valoración", en: "Best rating" },
    remove: { es: "Quitar", en: "Remove" },
    price: { es: "Precio", en: "Price" },
  },
  blog: {
    title: { es: "Blog", en: "Blog" },
    intro: {
      es: "Noticias, guías de compra y trucos para sacar partido a tus gadgets.",
      en: "News, buying guides and tips to get the most out of your gadgets.",
    },
    loading: { es: "Cargando artículos…", en: "Loading articles…" },
    empty: {
      es: "Todavía no hay artículos publicados.",
      en: "There are no published articles yet.",
    },
  },
  tops: {
    title: { es: "Top recomendados", en: "Top picks" },
    intro: {
      es: "Selecciones cerradas por categoría, uso y presupuesto para que no tengas que comparar cien fichas técnicas.",
      en: "Curated selections by category, use and budget so you don't have to compare a hundred spec sheets.",
    },
    loading: { es: "Cargando listas…", en: "Loading lists…" },
    empty: { es: "Todavía no hay listas publicadas.", en: "There are no published lists yet." },
  },
  quiz: {
    title: { es: "¿Qué gadget necesitas?", en: "Which gadget do you need?" },
    intro: {
      es: "Tres preguntas rápidas y te proponemos los productos de nuestro catálogo que mejor encajan con tu presupuesto y tu forma de usarlos.",
      en: "Three quick questions and we suggest the products in our catalog that best fit your budget and the way you use them.",
    },
    progress: { es: "Pregunta", en: "Question" },
    of: { es: "de", en: "of" },
    result: { es: "Nuestra recomendación", en: "Our recommendation" },
    restart: { es: "Repetir quiz", en: "Retake quiz" },
    empty: {
      es: "Todavía no hay productos suficientes en el catálogo para recomendarte nada.",
      en: "There are not enough products in the catalog yet to recommend anything.",
    },
  },
  quizSteps: {
    budgetQ: { es: "¿Cuál es tu presupuesto?", en: "What is your budget?" },
    budget50: { es: "Hasta 50 €", en: "Up to €50" },
    budget100: { es: "50 – 100 €", en: "€50 – €100" },
    budget250: { es: "100 – 250 €", en: "€100 – €250" },
    budgetAny: { es: "Sin límite", en: "No limit" },
    useQ: { es: "¿Para qué lo vas a usar?", en: "What will you use it for?" },
    useGaming: { es: "Gaming", en: "Gaming" },
    useWork: { es: "Teletrabajo y productividad", en: "Remote work and productivity" },
    useContent: { es: "Creación de contenido", en: "Content creation" },
    useMobile: { es: "Día a día y movilidad", en: "Everyday use and mobility" },
    osQ: { es: "¿Qué sistema operativo prefieres?", en: "Which operating system do you prefer?" },
    osWindows: { es: "Windows", en: "Windows" },
    osMac: { es: "macOS / iOS", en: "macOS / iOS" },
    osAndroid: { es: "Android", en: "Android" },
    osAny: { es: "Me da igual", en: "I don't mind" },
  },
  about: {
    title: { es: "Sobre GadgetMatrix", en: "About GadgetMatrix" },
    intro: {
      es: "Somos un equipo pequeño obsesionado con la tecnología de consumo. Publicamos fichas técnicas detalladas y opiniones honestas para que elijas sin perder horas comparando pestañas.",
      en: "We are a small team obsessed with consumer tech. We publish detailed spec sheets and honest opinions so you can choose without wasting hours comparing browser tabs.",
    },
    method: { es: "Nuestro método", en: "Our method" },
    methodText: {
      es: "Cada producto se documenta con sus especificaciones oficiales, se contrasta con pruebas de uso real y se resume en pros y contras. Las fichas viven en nuestra propia base de datos, así que se actualizan cuando cambian precios o especificaciones.",
      en: "Every product is documented with its official specifications, checked against real-world testing and summarised into pros and cons. The spec sheets live in our own database, so they are updated whenever prices or specifications change.",
    },
    affiliate: { es: "Transparencia de afiliación", en: "Affiliate transparency" },
    affiliateText: {
      es: "Los botones de compra llevan nuestro identificador de afiliado de Amazon. Si compras a través de ellos, recibimos una pequeña comisión sin coste adicional para ti. Eso nunca condiciona la valoración de un producto.",
      en: "Buy buttons carry our Amazon affiliate tag. If you buy through them we receive a small commission at no extra cost to you. That never influences how we rate a product.",
    },
    prices: { es: "Precios", en: "Prices" },
    pricesText: {
      es: "Los precios mostrados son orientativos y pueden variar. El precio válido siempre es el que aparece en Amazon en el momento de la compra.",
      en: "The prices shown are indicative and may vary. The valid price is always the one shown on Amazon at the time of purchase.",
    },
    cta: { es: "Ver el catálogo", en: "Browse the catalog" },
  },
  product: {
    specs: { es: "Ficha técnica", en: "Specifications" },
    pros: { es: "A favor", en: "Pros" },
    cons: { es: "En contra", en: "Cons" },
    buy: { es: "Ver en Amazon", en: "View on Amazon" },
    share: { es: "Compartir:", en: "Share:" },
    copy: { es: "Copiar", en: "Copy" },
    copied: { es: "Enlace copiado", en: "Link copied" },
    copyError: { es: "No se pudo copiar el enlace.", en: "Could not copy the link." },
    alertTitle: { es: "Alerta de bajada de precio", en: "Price drop alert" },
    alertPlaceholder: { es: "Precio objetivo (€)", en: "Target price (€)" },
    alertCta: { es: "Avisarme", en: "Notify me" },
    alertLogin: { es: "Inicia sesión", en: "Sign in" },
    alertLoginText: {
      es: "para recibir avisos cuando baje de precio.",
      en: "to get notified when the price drops.",
    },
    alertOk: {
      es: "Te avisaremos cuando baje de ese precio.",
      en: "We will let you know when it drops below that price.",
    },
    alertError: { es: "No se pudo crear la alerta.", en: "The alert could not be created." },
    reviews: { es: "Opiniones", en: "Reviews" },
    related: { es: "Productos similares", en: "Similar products" },
  },
  auth: {
    title: { es: "Acceso administrador", en: "Admin access" },
    email: { es: "Correo electrónico", en: "Email address" },
    password: { es: "Contraseña", en: "Password" },
    signIn: { es: "Entrar", en: "Sign in" },
    signOut: { es: "Salir", en: "Sign out" },
    signUp: { es: "Crear cuenta", en: "Create account" },
  },
} as const;

export type StringGroup = keyof typeof STRINGS;

export function getLocale(storage?: Pick<Storage, "getItem">): Locale {
  try {
    return storage?.getItem(LOCALE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function setLocale(locale: Locale, storage?: Pick<Storage, "setItem">): void {
  try {
    storage?.setItem(LOCALE_KEY, locale);
  } catch {
    // localStorage bloqueado: se aplica igual a esta sesión.
  }
  try {
    document.documentElement.lang = locale;
  } catch {
    // Sin DOM (prerender/tests): no hay nada que aplicar.
  }
}

/** Devuelve el texto de una clave en el idioma activo. */
export function t<Group extends StringGroup>(
  group: Group,
  key: keyof (typeof STRINGS)[Group],
  locale: Locale,
): string {
  const entry = STRINGS[group][key] as { es: string; en: string };
  return entry[locale] ?? entry.es;
}

/** Traductor ya atado a un idioma: `tr("deals", "title")`. */
export type Translator = <Group extends StringGroup>(
  group: Group,
  key: keyof (typeof STRINGS)[Group],
) => string;

export function createTranslator(locale: Locale): Translator {
  return (group, key) => t(group, key, locale);
}

/** `Intl` no acepta "es"/"en" sueltos para fechas: hay que darle un locale completo. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "es-ES";
}

/**
 * Script inline que se inyecta en <head> y fija `lang` en <html> antes del
 * primer pintado, para que el idioma guardado no provoque un salto visual.
 * Debe mantenerse sincronizado con `getLocale`.
 */
export const LOCALE_INIT_SCRIPT = `(function(){try{var l=null;try{l=window.localStorage.getItem("${LOCALE_KEY}")}catch(e){}
if(l==="en"||l==="es"){document.documentElement.lang=l;}}catch(e){}})();`;

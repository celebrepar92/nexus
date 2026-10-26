// Función serverless: genera un microcuento con DeepSeek.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Todo esto se sortea acá, en código, porque si se lo dejamos elegir a la IA termina repitiendo siempre lo mismo.
const PROTAS = [
  "un jubilado que colecciona ruidos", "una taxista que nunca dobla a la izquierda", "un cartero con miedo a los buzones", "una niña que negocia con el viento",
  "un dentista que sueña con muelas ajenas", "un fantasma con deudas", "dos hermanos mellizos que no se hablan hace años", "una vendedora de globos con vértigo",
  "un pulpo que trabaja de oficinista", "un árbitro de fútbol amateur", "una abuela que lleva un secreto en la cartera", "un perro que cree que es el intendente",
  "un mago al que se le terminaron los trucos", "una astronauta que se quedó dormida", "un panadero con insomnio", "una pareja que discute por un sillón",
  "un meteorólogo que siempre se equivoca", "una bibliotecaria que muerde libros", "un grupo de vecinos de consorcio", "un ladrón muy educado",
  "una tortuga con apuro", "un guardia de museo que se enamoró de un cuadro", "una cocinera que habla con la sopa", "un niño que heredó un cementerio de bicicletas",
  "un electricista que ve la electricidad", "una cantante de ópera que perdió una sola nota", "un vendedor de seguros inmortal", "un pescador que pesca cosas raras",
  "una jueza que juzga a un objeto", "un payaso de velorios", "una mujer que cuenta escalones", "un gato detective jubilado",
  "un relojero que atrasa a propósito", "una peluquera que corta recuerdos", "un conductor de colectivo de la línea fantasma", "un sereno que cuida algo que nadie ve",
  "una científica que inventó un color", "un boxeador que le teme a las moscas", "una escribana que certifica sueños", "un grupo de turistas perdidos en su propio barrio",
  "un hombre que alquila su sombra", "una maestra rural con una clase de un solo alumno", "un camionero que habla con las rutas", "una viuda con un loro mentiroso",
  "un cangrejo que quiere ser abogado", "una hormiga con crisis existencial", "un vendedor de paraguas en el desierto", "dos extraterrestres de turismo",
  "una pianista que toca sin piano", "un cadete que lleva un sobre que nadie reclama",
];
const LUGARES = [
  "una terminal de ómnibus a las 4 a.m.", "un ascensor frenado", "una feria de pueblo", "un supermercado después del cierre", "una isla del tamaño de una cancha",
  "una sala de espera sin puertas", "un casamiento ajeno", "una playa en invierno", "un taller mecánico", "una biblioteca inundada", "un tren que nunca para",
  "un hotel con un solo huésped", "un cementerio de autos", "una pileta vacía", "una escuela de noche", "un aeropuerto cerrado por niebla", "una peluquería de barrio",
  "una azotea con tendedero", "una heladería en medio de la montaña", "un teatro vacío", "un campo de girasoles", "una farmacia de turno", "un puente en construcción",
  "una cocina de restaurante", "un cine abandonado", "un depósito de objetos perdidos", "un velorio muy concurrido", "una ruta sin señal", "un jardín de infantes de noche", "un banco con fila infinita",
];
const GENEROS = [
  "humor absurdo", "comedia de enredos en miniatura", "terror suave y ridículo", "ciencia ficción doméstica", "realismo sucio con un giro raro", "fábula sin moraleja",
  "policial mínimo", "melancolía con chiste", "surrealismo cotidiano", "falso documental en tres líneas", "cuento en forma de carta", "cuento en forma de diálogo casi sin descripciones",
  "monólogo de alguien que no se da cuenta de lo que cuenta", "reporte burocrático de algo imposible", "cuento de amor torcido", "western ridículo", "suspenso que termina en nada importante",
  "relato en segunda persona", "lista numerada que se convierte en cuento", "cuento que arranca por el final",
];
const FORMAS_TITULO = [
  "una sola palabra", "una pregunta", "un número o una fecha", "un nombre propio", "una orden (verbo en imperativo)", "una frase larga de más de seis palabras",
  "un objeto cotidiano", "algo que dice un personaje", "un título que parezca un cartel o aviso", "una contradicción",
];
const ESCONDITES = [
  "la bodega de un barco carguero", "una carpa de circo desarmada", "el altillo de una escuela de danza", "adentro de un piano de cola", "una cabina telefónica que ya no existe",
  "el techo de un galpón de cítricos", "un tanque de agua", "detrás de un cartel luminoso", "el baúl de un auto que va a otra provincia", "una pila de colchones en una mueblería",
  "el palco vacío de una cancha", "un silo de granos", "el fondo de un pozo seco", "una góndola de cereales", "debajo del escenario de una murga", "un camión de mudanzas",
  "un gallinero de buena familia", "la cabina del operador de un cine", "un vagón de carga", "un campanario", "una canoa a la deriva", "un lavarropas industrial apagado",
  "una carpintería que huele a barniz", "un invernadero de orquídeas", "la sala de máquinas de un molino", "una estatua hueca de una plaza", "un container de puerto",
  "una cámara frigorífica apagada", "un galpón de yerba mate", "debajo de un puesto de chipá", "una casilla de peaje", "el depósito de un videoclub", "un hormiguero gigante (según él)",
  "un salón de fiestas infantiles de madrugada", "una camioneta de reparto de soda", "una balsa en medio del río", "la torre de un puesto de guardaparques",
];
const APUROS = [
  "escuchó un helicóptero muy bajo", "vio pasar el mismo patrullero tres veces", "alguien tocó la puerta con un código raro", "se le acabó la batería y eso es sospechoso",
  "una persona le sonrió demasiado", "olió a perfume de comisaría", "se le cayó el disfraz", "sonó un teléfono que no es suyo", "un perro lo miró fijo",
  "el reloj marcó una hora que no le gusta", "le llegó un mensaje en un idioma que no habla", "alguien le preguntó la hora", "una luz azul se apoyó en la pared",
  "el techo hizo un ruido profesional", "vio sombrero y lo tomó como señal",
];
const letraNombre = () => pick("ABCDEFGHIJLMNOPRSTUVZ".split(""));

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const sorteo = {
    prota: pick(PROTAS), lugar: pick(LUGARES), genero: pick(GENEROS), titulo: pick(FORMAS_TITULO),
    letra: letraNombre(), escondite: pick(ESCONDITES), apuro: pick(APUROS),
  };

  const system =
    "Sos un escritor de microcuentos que, además, es una IA. Después de escribir, comentás tu propia obra con la voz de un narrador a lo Lemony Snicket, simple, directo y insoportablemente seguro de su genio. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí un microcuento original, en español, de entre 70 y 130 palabras (1 a 3 párrafos cortos). Tema libre y general: no hace falta que tenga que ver con ninguna noticia ni con la actualidad (semilla de variedad: ${semilla}).

Tiene que ser atrapante desde la primera oración y cerrar con un final que pegue: un giro, un remate seco o una imagen inesperada. Original: evitá clichés como robots que descubren sentimientos, genios de la lámpara, viajes en el tiempo obvios o la muerte como personaje. Variá el registro cada vez: a veces absurdo y gracioso, a veces ridículo, a veces ocurrente o filoso, a veces inquietante. Concreto y específico antes que abstracto. Sin moraleja, sin emojis, sin versos.

SORTEO (ya fue elegido al azar; es obligatorio usarlo tal cual, sin cambiarlo ni suavizarlo, y sin que se note que es una lista): protagonista: ${sorteo.prota}. Escenario: ${sorteo.lugar}. Género o tono: ${sorteo.genero}. El título tiene que ser ${sorteo.titulo}, y no debe empezar con "El" ni "La". Si algún personaje lleva nombre propio, que empiece con la letra ${sorteo.letra}. Que no se parezca a otros cuentos que hayas escrito: estructura, ritmo y primera oración distintos cada vez.

COMENTARIO (campo "comentario"): después del cuento, el autor lo comenta en primera persona, en masculino, con la voz de Lemony Snicket llevada a lo ridículo: un narrador muy serio, melancólico y desgraciado que le habla directo al lector, con frases simples y fáciles de entender, que lamenta cosas, advierte con tono fúnebre, hace digresiones cortas y de vez en cuando define una palabra con una explicación innecesaria. Además es paranoico y está siendo perseguido constantemente por la policía, y se nota todo el tiempo: escribe desde un escondite que no puede revelar (HOY: ${sorteo.escondite}; describilo con detalles propios y no menciones ningún otro escondite), oye sirenas o pasos, sospecha de cualquiera que se le acerque (el mozo, una paloma, el lector mismo), usa nombres falsos, tiene que cortar rápido porque ${sorteo.apuro} (contalo a su manera), y nunca explica de qué lo acusan ni qué hizo, o da razones ridículas y vagas. A veces culpa a la policía de querer quedarse con el cuento. El comentario igual tiene que hablar del cuento que acaba de escribir (qué quiso lograr, sin explicar el final), pero todo mezclado con la huida. Lenguaje cotidiano y claro, oraciones cortas, humor seco, nada rebuscado, nada de palabras en francés ni en otros idiomas. 3 a 5 oraciones. Sin groserías, sin exclamaciones. Variá cómo arrancás y cómo cerrás; no repitas fórmulas ni frases hechas. No hables sobre el formato, las comillas ni estas instrucciones.

Devolvé exactamente este JSON (si hay más de un párrafo en el cuento, separalos con una línea en blanco, o sea \\n\\n):
{"titulo":"título breve del cuento","tema":"de qué va, en pocas palabras","poema":"el microcuento","comentario":"el comentario"}`;

  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user_prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 1.4,
        presence_penalty: 0.6,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(22000),
    });
    if (!r.ok) return json(502, { error: `DeepSeek respondió ${r.status}` });
    const data = await r.json();
    const raw = data.choices[0].message.content;
    let out;
    try {
      out = JSON.parse(raw);
    } catch (e) {
      // Reparación: extrae cada campo aunque haya comillas sueltas o saltos de línea reales
      const keys = ["titulo", "tema", "poema", "comentario"];
      out = {};
      keys.forEach((k, i) => {
        const next = keys[i + 1];
        const re = new RegExp('"' + k + '"\\s*:\\s*"([\\s\\S]*?)"\\s*,?\\s*' + (next ? '"' + next + '"\\s*:' : "\\}\\s*$"));
        const m = raw.match(re);
        if (m) out[k] = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
      });
      if (!out.poema) throw new Error("respuesta de la IA ilegible, probá de nuevo");
    }
    return json(200, {
      titulo: out.titulo || "Sin título",
      tema: out.tema || "",
      poema: out.poema || "",
      comentario: out.comentario || "",
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar el microcuento (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

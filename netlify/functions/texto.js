// netlify/functions/texto.js
// Genera con DeepSeek un texto breve (haiku, poema, soneto, etc.) para la hoja de asistencia.
// Requiere la variable de entorno DEEPSEEK_API_KEY y que el usuario haya iniciado sesión (Netlify Identity).

const pick = a => a[Math.floor(Math.random() * a.length)];
const pickN = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);

const TEMAS = [
  "el agua", "la espera", "una ciudad de noche", "el taller vacío", "el río", "la memoria", "una escalera",
  "el viento en los árboles", "un mapa viejo", "el tiempo", "la lluvia sobre el techo", "una puerta entreabierta",
  "el silencio", "los cimientos", "una sombra larga", "el primer café de la mañana", "la luz de la tarde",
  "un puente", "lo que queda sin decir", "el regreso", "una ventana", "el barro rojo", "la siesta", "el cansancio lindo"
];

const ESTILOS_POEMA = [
  "verso libre contemplativo", "poesía de imágenes sencillas y concretas", "tono elegíaco y sereno",
  "tono irónico y tierno a la vez", "poesía urbana, de calle y de noche", "tono épico, pero de cosas pequeñas"
];

const FILOSOFOS = [
  "Aristóteles", "Hegel", "Marx", "Platón", "Kant", "Nietzsche", "Spinoza", "Hume", "Descartes", "Heráclito",
  "Sócrates", "Simone de Beauvoir", "Hannah Arendt", "Wittgenstein", "Kierkegaard", "Schopenhauer", "Epicuro",
  "Séneca", "Hobbes", "Rousseau", "Foucault", "Sartre", "Heidegger", "Confucio"
];

const SYS = "Sos un escritor excelente. Escribís en español neutro, con lenguaje claro y precioso, sin clichés ni moralejas explícitas, " +
  "y sin copiar obras existentes. Respondés SIEMPRE con un único objeto JSON válido, sin texto fuera del JSON.";

// Cada tipo arma su propio pedido. "texto" usa \n para saltos de línea.
const TIPOS = {
  haiku: (tema) => ({
    max: 250, temp: 1.2, nombre: "Haiku",
    prompt: `Escribí un haiku original en español sobre: ${tema}. Tres versos de 5, 7 y 5 sílabas (contá bien las sílabas métricas), con una imagen concreta de la naturaleza o lo cotidiano y un giro sutil en el último verso. ` +
      `Devolvé JSON: {"titulo": "título muy breve", "texto": "verso1\\nverso2\\nverso3"}`
  }),
  poema: (tema) => ({
    max: 900, temp: 1.2, nombre: "Poema largo",
    meta: pick(ESTILOS_POEMA),
    prompt: `Escribí un poema original, más largo, en español sobre: ${tema}. Entre 20 y 28 versos, en 4 o 5 estrofas separadas por una línea en blanco. Estilo: ${"__ESTILO__"}. ` +
      `Que tenga un desarrollo (no una sola idea repetida), imágenes frescas y un cierre que resuene. ` +
      `Devolvé JSON: {"titulo": "título", "texto": "versos con \\n entre versos y \\n\\n entre estrofas"}`
  }),
  soneto: (tema) => ({
    max: 600, temp: 1.1, nombre: "Soneto",
    prompt: `Escribí un soneto original en español sobre: ${tema}. Catorce endecasílabos: dos cuartetos (ABBA ABBA) y dos tercetos (CDC DCD), con rima consonante. ` +
      `El último terceto debe cerrar con un giro. Devolvé JSON: {"titulo": "título", "texto": "los 14 versos con \\n entre versos y \\n\\n entre estrofas"}`
  }),
  limerick: (tema) => ({
    max: 300, temp: 1.3, nombre: "Limerick",
    prompt: `Escribí un limerick humorístico original en español sobre: ${tema}. Cinco versos con rima AABBA, ritmo saltarín y un final ingenioso o absurdo, sin groserías. ` +
      `Devolvé JSON: {"titulo": "título breve", "texto": "los 5 versos con \\n entre versos"}`
  }),
  microrrelato: (tema) => ({
    max: 600, temp: 1.2, nombre: "Microrrelato",
    prompt: `Escribí un microrrelato original en español sobre: ${tema}. Entre 90 y 150 palabras, un solo párrafo, con un personaje, una situación y un final que deje pensando (final abierto o con sorpresa). ` +
      `Devolvé JSON: {"titulo": "título", "texto": "el microrrelato"}`
  }),
  fabula: (tema) => ({
    max: 800, temp: 1.2, nombre: "Fábula",
    prompt: `Escribí una fábula original en español protagonizada por animales, inspirada en: ${tema}. Entre 150 y 220 palabras, en 2 o 3 párrafos cortos separados por una línea en blanco. ` +
      `Cerrá con una moraleja de una sola línea, ingeniosa y no obvia, precedida por "Moraleja:". Devolvé JSON: {"titulo": "título", "texto": "la fábula con \\n\\n entre párrafos"}`
  }),
  aforismos: (tema) => ({
    max: 500, temp: 1.2, nombre: "Aforismos",
    prompt: `Escribí 6 aforismos originales en español inspirados en: ${tema}. Cada uno de una o dos oraciones, agudos, con humor o melancolía, sin lugares comunes. ` +
      `Devolvé JSON: {"titulo": "título breve", "texto": "un aforismo por línea, separados por \\n"}`
  }),
  dialogo: (tema, extra) => ({
    max: 1100, temp: 1.1, nombre: "Diálogo filosófico",
    meta: extra.filosofos.join(", "),
    prompt: `Escribí un diálogo filosófico entre ${extra.filosofos.join(", ")}, cada uno defendiendo su propio sistema, sobre este asunto: ${tema}. ` +
      `Lenguaje simple y claro, sin ridiculeces: una discusión de alto nivel en la que se contestan y se retroalimentan entre sí. Entre 8 y 12 intervenciones breves. ` +
      `Solo diálogo, sin acotaciones ni corchetes. Formato de cada línea: "NOMBRE: frase". ` +
      `Devolvé JSON: {"titulo": "título", "texto": "una intervención por línea, separadas por \\n"}`
  })
};

// Si el navegador pide imagen, la IA también describe una pintura que combine con el ánimo del texto.
const PLAN_TXT = ` Además, agregá al JSON una clave "plan" (objeto) que describa una pintura en blanco y negro que acompañe al texto y refleje su ánimo, con estos campos: ` +
  `"genero" (uno de: paisaje, marina, naturaleza_muerta, campos, vortice), "composicion" (tercios, aurea, centrada, diagonal, triangular), ` +
  `"luz" (izquierda, derecha, arriba), "clave" (alta = luminosa, media, baja = sombría), "pincelada" (suave, empastada, fluida, fina), ` +
  `"formato" (horizontal, vertical, cuadrado) y los números "contraste" (0.2 a 1), "horizonte" (0.28 a 0.7), "densidad" (0.15 a 1), "neblina" (0 a 0.8).`;

const resp = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(obj) });

exports.handler = async (event, context) => {
  // Solo usuarios con sesión (Netlify Identity manda el usuario en clientContext cuando el JWT es válido)
  const user = context.clientContext && context.clientContext.user;
  if (!user) return resp(401, { error: "No autorizado" });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return resp(500, { error: "Falta DEEPSEEK_API_KEY" });

  const q = event.queryStringParameters || {};
  let tipo = String(q.tipo || "").toLowerCase();
  if (tipo === "sorpresa" || !TIPOS[tipo]) tipo = pick(Object.keys(TIPOS));
  const tema = String(q.tema || "").replace(/[\r\n]+/g, " ").trim().slice(0, 120) || pick(TEMAS);

  const imagen = String(q.imagen || "") === "1";
  const cfg = TIPOS[tipo](tema, { filosofos: pickN(FILOSOFOS, 3) });
  const prompt = cfg.prompt.replace("__ESTILO__", cfg.meta || "") + (imagen ? PLAN_TXT : "");

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 24000);
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: cfg.temp,
        max_tokens: cfg.max + (imagen ? 250 : 0)
      }),
      signal: ctl.signal
    });
    if (!r.ok) return resp(502, { error: "DeepSeek respondió " + r.status });
    const data = await r.json();
    let raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    raw = raw.replace(/^```json|```$/g, "").trim();

    let j;
    try { j = JSON.parse(raw); }
    catch (e) { const m = raw.match(/\{[\s\S]*\}/); j = m ? JSON.parse(m[0]) : null; }
    if (!j || !j.texto) return resp(502, { error: "Respuesta inválida de la IA" });

    return resp(200, {
      tipo,
      titulo: String(j.titulo || cfg.nombre).slice(0, 90),
      texto: String(j.texto).replace(/\r/g, "").trim().slice(0, 3800),
      meta: cfg.meta && tipo === "dialogo" ? cfg.meta : (tipo === "poema" ? cfg.meta : ""),
      plan: imagen && j.plan && typeof j.plan === "object" ? j.plan : undefined
    });
  } catch (e) {
    return resp(504, { error: e.name === "AbortError" ? "La IA tardó demasiado" : "Error: " + e.message });
  } finally {
    clearTimeout(timer);
  }
};

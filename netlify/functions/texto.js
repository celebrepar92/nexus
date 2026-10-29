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

// Participantes posibles del debate: [nombre, descripción breve]. Cada vez se sortean tres.
// Para sumar a alguien, agregá una línea con el mismo formato.
const FILOSOFOS = [
  // Filósofos y pensadores
  ["Aristóteles", "filósofo griego (384-322 a. C.); lógica, ética de la virtud y política"],
  ["Hegel", "filósofo alemán (1770-1831); dialéctica y la historia como despliegue de la libertad"],
  ["Marx", "filósofo y economista alemán (1818-1883); crítica del capitalismo y materialismo histórico"],
  ["Platón", "filósofo griego (c. 427-347 a. C.); teoría de las Ideas y el Estado ideal"],
  ["Kant", "filósofo alemán (1724-1804); razón crítica y ética del deber"],
  ["Nietzsche", "filósofo alemán (1844-1900); crítica de la moral y voluntad de poder"],
  ["Spinoza", "filósofo holandés (1632-1677); monismo, libertad y ética racional"],
  ["Hume", "filósofo escocés (1711-1776); empirismo y escepticismo"],
  ["Descartes", "filósofo francés (1596-1650); duda metódica y racionalismo"],
  ["Heráclito", "filósofo griego (c. 535-475 a. C.); todo fluye, el devenir"],
  ["Sócrates", "filósofo ateniense (c. 470-399 a. C.); el diálogo y la pregunta como método"],
  ["Simone de Beauvoir", "filósofa francesa (1908-1986); existencialismo y feminismo"],
  ["Hannah Arendt", "filósofa alemana-estadounidense (1906-1975); totalitarismo, acción y política"],
  ["Wittgenstein", "filósofo austríaco (1889-1951); lenguaje y juegos de lenguaje"],
  ["Kierkegaard", "filósofo danés (1813-1855); angustia, fe y existencia individual"],
  ["Schopenhauer", "filósofo alemán (1788-1860); la voluntad y el pesimismo"],
  ["Epicuro", "filósofo griego (341-270 a. C.); placer sereno y ausencia de dolor"],
  ["Séneca", "filósofo estoico romano (c. 4 a. C.-65 d. C.); dominio de sí y brevedad de la vida"],
  ["Hobbes", "filósofo inglés (1588-1679); contrato social y Estado soberano"],
  ["Rousseau", "filósofo suizo-francés (1712-1778); voluntad general y desigualdad"],
  ["Foucault", "filósofo francés (1926-1984); poder, saber e instituciones"],
  ["Sartre", "filósofo francés (1905-1980); existencialismo y libertad radical"],
  ["Heidegger", "filósofo alemán (1889-1976); el ser y la existencia (Dasein)"],
  ["Confucio", "pensador chino (551-479 a. C.); ética, ritual y armonía social"],
  ["Maquiavelo", "pensador florentino (1469-1527); realismo político y conquista del poder"],
  ["Locke", "filósofo inglés (1632-1704); derechos naturales y liberalismo"],
  ["Montesquieu", "pensador francés (1689-1755); división de poderes"],
  ["John Stuart Mill", "filósofo inglés (1806-1873); utilitarismo y libertad individual"],
  ["Tocqueville", "pensador francés (1805-1859); democracia e igualdad en América"],
  ["Edmund Burke", "pensador irlandés-británico (1729-1797); conservadurismo y tradición"],
  ["Adam Smith", "economista y filósofo escocés (1723-1790); mercado y simpatía moral"],
  ["Max Weber", "sociólogo alemán (1864-1920); racionalización, burocracia y ética protestante"],
  ["Gramsci", "pensador marxista italiano (1891-1937); hegemonía cultural"],
  ["Rosa Luxemburgo", "revolucionaria polaco-alemana (1871-1919); democracia socialista"],
  ["Mary Wollstonecraft", "pensadora inglesa (1759-1797); pionera del feminismo"],
  ["Paulo Freire", "educador brasileño (1921-1997); pedagogía del oprimido"],
  ["Mariátegui", "pensador marxista peruano (1894-1930); socialismo e indigenismo en América Latina"],
  ["Keynes", "economista británico (1883-1946); intervención estatal y demanda agregada"],
  ["Hayek", "economista austríaco (1899-1992); orden espontáneo y liberalismo"],
  // Figuras políticas e históricas
  ["Juan Perón", "militar y presidente argentino (1895-1974); fundador del peronismo y la justicia social"],
  ["Eva Perón", "dirigente argentina (1919-1952); derechos de las mujeres y acción social"],
  ["Simón Bolívar", "libertador venezolano (1783-1830); independencia e integración americana"],
  ["José de San Martín", "militar argentino (1778-1850); libertador de Argentina, Chile y Perú"],
  ["José Gervasio Artigas", "caudillo oriental (1764-1850); federalismo y reforma agraria"],
  ["Manuel Belgrano", "abogado y militar argentino (1770-1820); educación y economía para la patria"],
  ["Sarmiento", "presidente argentino (1811-1888); educación pública y \"civilización y barbarie\""],
  ["Juan Bautista Alberdi", "jurista argentino (1810-1884); bases constitucionales liberales"],
  ["Simón Rodríguez", "maestro de Bolívar (1769-1854); educación popular americana"],
  ["Salvador Allende", "presidente chileno (1908-1973); vía democrática al socialismo"],
  ["Franklin Roosevelt", "presidente de EE. UU. (1882-1945); New Deal y Estado de bienestar"],
  ["Huey Long", "senador estadounidense (1893-1935); populismo y reparto de la riqueza"],
  ["Margaret Thatcher", "primera ministra británica (1925-2013); neoliberalismo y Estado mínimo"],
  ["Maximilien Robespierre", "revolucionario francés (1758-1794); virtud republicana y Terror jacobino"],
  ["Cardenal Richelieu", "ministro francés (1585-1642); razón de Estado y absolutismo"],
  ["Luis XIV", "rey de Francia (1638-1715); monarquía absoluta"],
  ["Lenin", "revolucionario ruso (1870-1924); partido de vanguardia y Estado soviético"],
  ["Mao Zedong", "líder chino (1893-1976); revolución campesina y maoísmo"],
  ["Deng Xiaoping", "líder chino (1904-1997); reforma y apertura económica"],
  ["Gandhi", "líder indio (1869-1948); no violencia y desobediencia civil"],
  ["Martin Luther King", "pastor y líder estadounidense (1929-1968); derechos civiles y no violencia"],
  ["Nelson Mandela", "líder sudafricano (1918-2013); lucha contra el apartheid y reconciliación"],
  // Trabajo Social
  ["Mary Richmond", "pionera estadounidense del Trabajo Social (1861-1928); diagnóstico social y caso individual"],
  ["Jane Addams", "reformadora estadounidense (1860-1935); Hull House y el trabajo social comunitario"]
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
    elenco: extra.elenco,
    meta: extra.elenco.map(e => e.n).join(", "),
    prompt: `Escribí un diálogo imaginado entre estas tres figuras: ${extra.elenco.map(e => `${e.n} (${e.d})`).join("; ")}. El asunto es: ${tema}. ` +
      `Cada una defiende su propio pensamiento o proyecto, apoyándose en las ideas y la trayectoria que se le conocen; no inventes hechos ni cites frases textuales como si fueran reales. ` +
      `Aunque sean de épocas distintas, conversan como si coincidieran. ` +
      `Lenguaje simple y claro, sin ridiculeces: una discusión de alto nivel en la que se contestan y se retroalimentan entre sí. Entre 8 y 12 intervenciones breves. ` +
      `Solo diálogo, sin acotaciones ni corchetes. Formato de cada línea: "NOMBRE: frase", usando el nombre tal como está escrito arriba. ` +
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
  const cfg = TIPOS[tipo](tema, { elenco: pickN(FILOSOFOS, 3).map(([n, d]) => ({ n, d })) });
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
      elenco: tipo === "dialogo" ? cfg.elenco : undefined,
      plan: imagen && j.plan && typeof j.plan === "object" ? j.plan : undefined
    });
  } catch (e) {
    return resp(504, { error: e.name === "AbortError" ? "La IA tardó demasiado" : "Error: " + e.message });
  } finally {
    clearTimeout(timer);
  }
};

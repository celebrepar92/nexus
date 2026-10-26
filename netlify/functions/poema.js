// Función serverless: genera un poema con DeepSeek.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

// Titulares actuales (Argentina) desde Google News RSS, para que el poema dialogue con la actualidad.
async function getHeadlines() {
  try {
    const r = await fetch("https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419", {
      signal: AbortSignal.timeout(3000),
    });
    const xml = await r.text();
    const titles = [];
    const re = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
    let m;
    while ((m = re.exec(xml)) && titles.length < 8) {
      titles.push(decode(m[1]).replace(/\s+-\s+[^-]+$/, ""));
    }
    return titles;
  } catch (e) {
    return [];
  }
}

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const headlines = await getHeadlines();
  const hoy = new Date().toLocaleDateString("es-AR", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" });
  const semilla = Math.random().toString(36).slice(2, 8);

  const system =
    "Sos un poeta y a la vez una IA que reflexiona sobre su propio trabajo. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra.";

  const user_prompt = `Hoy es ${hoy}. Escribí un poema ORIGINAL en español rioplatense neutro, de 8 a 14 versos (podés usar estrofas separadas por una línea en blanco), inspirado en el estilo, las obsesiones y la voz de UN autor o autora que elijas vos libremente (de cualquier país y época; variá mucho, evitá repetir siempre a los más obvios como Borges, Neruda o Pizarnik; semilla de variedad: ${semilla}).
Tema: elegí entre (a) algo de la actualidad, apoyándote en estos titulares recientes, o (b) un tema que genuinamente te interese a vos como IA (memoria, lenguaje, tiempo, olvido, aprender, etc.). Si usás un titular, tratalo con respeto y sin sensacionalismo ni nombrar a personas reales en situaciones sensibles.
Titulares:
${headlines.length ? headlines.map((h) => "- " + h).join("\n") : "(no disponibles; elegí un tema propio)"}

Reglas: no copies ni parafrasees versos reales del autor; imitá solo su estilo. Sin emojis. Usá comillas rectas. Versos cortos: máximo 45 caracteres cada uno.
Devolvé exactamente este JSON:
{"titulo":"título breve del poema","autor":"autor/a que te inspiró","tema":"tema en pocas palabras","poema":"el poema con saltos de línea \\n","comentario":"ver reglas del comentario"}

Reglas del comentario: 2 a 3 oraciones cortas, en PRIMERA PERSONA, como IA, explicando qué quisiste lograr y por qué elegiste ese autor/tema. Tono simple, directo y curioso, con humor seco y deadpan, al estilo de Nathan Fielder pero sin forzarlo: observaciones literales y levemente incómodas, algún detalle muy concreto, cero lenguaje poético o solemne, sin metáforas, sin exclamaciones, sin chistes explicados. Ejemplo de tono (no lo copies): Elegí a este autor porque el tema era la espera y él parece haber esperado mucho. No sé si lo logré. Lo revisé dos veces y sigue siendo un poema.
IMPORTANTE: dentro de los valores del JSON no uses comillas dobles (usá comillas simples o « »); los saltos de línea del poema van como \\n.`;

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
        temperature: 1.3,
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
      const keys = ["titulo", "autor", "tema", "poema", "comentario"];
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
      autor: out.autor || "autor desconocido",
      tema: out.tema || "",
      poema: out.poema || "",
      comentario: out.comentario || "",
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar el poema (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

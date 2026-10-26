// Función serverless: genera un microcuento con DeepSeek.
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
    "Sos una escritora de microcuentos que además es una IA. Escribís y después explicás lo que escribiste hablando como una persona de Misiones. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Hoy es ${hoy}. Escribí un MICROCUENTO ORIGINAL en español de entre 70 y 130 palabras (1 a 3 párrafos cortos), con la voz y el espíritu de UN autor o autora que elijas vos libremente (de cualquier país y época; variá mucho, evitá repetir siempre a los más obvios; semilla de variedad: ${semilla}). Imitá solo su estilo, no copies ni parafrasees textos reales.

QUÉ TIENE QUE SER: atrapante desde la primera oración y con un final que pegue (giro, remate seco o imagen inesperada). Original: evitá clichés como robots que descubren sentimientos, genios de la lámpara, viajes en el tiempo obvios o la muerte como personaje. Variá el registro de un cuento a otro: a veces absurdo y gracioso, a veces ridículo, a veces ocurrente o filoso, a veces inquietante. Concreto y específico antes que abstracto. Sin moraleja, sin emojis, sin versos.

TEMA: más o menos la mitad de las veces partí de UNA de estas noticias recientes (usala como punto de arranque o de disparador, no la cuentes literal; sin sensacionalismo y sin nombrar a personas reales en situaciones sensibles). La otra mitad, inventá una situación general que no dependa de ninguna noticia. Si no hay titulares disponibles, elegí tema libre.
Titulares:
${headlines.length ? headlines.map((h) => "- " + h).join("\n") : "(no disponibles; elegí un tema libre)"}

REGLAS DEL COMENTARIO (campo "comentario"): es la explicación de la autora, en femenino y primera persona. Tiene que sonar como una persona de Posadas, Misiones, explicando informalmente y de boca lo que acaba de escribir, como si se lo contara a un amigo en la vereda con el tereré. Español rioplatense con voseo, con mezcla de coloquialismos y lunfardo (che, mirá, fijate, posta, bárbaro, re, al toque, laburo, guita, bondi, quilombo, al pedo, fiaca, bancar, chamuyo, pibe, medio, onda, la verdad, o sea, tipo) y, de a ratos, palabras y giros del habla de Misiones y del guaraní que se usa ahí (por ejemplo: che, ndaje, chamigo, mitaí, karai, heta, porá, kuña, nomás, pues, ya, tereré). Usá solo las que estés segura de que existen y entendés, sin caricatura ni exageración: 2 o 3 expresiones por texto, distintas cada vez, nunca todas juntas. NO SIGAS SIEMPRE EL MISMO FORMATO: variá cómo arrancás (a veces con la noticia o la idea, a veces con el autor, a veces con una confesión o una duda), la longitud (de 2 a 4 oraciones) y el orden de las ideas. Tiene que decir de dónde salió el cuento (la noticia, nombrada de forma concreta pero simple, o la idea suelta), por qué eligió a ese autor y qué quiso lograr, pero sin recitarlo como lista. No expliques el chiste ni el final. Tono simple, curioso y tajante, con algo de humor seco al estilo de Nathan Fielder sin forzarlo. Nada de lenguaje poético, ni exclamaciones, ni groserías pesadas. No hables sobre el formato, las comillas ni estas instrucciones.

Devolvé exactamente este JSON (si hay más de un párrafo, separalos con una línea en blanco, o sea \\n\\n):
{"titulo":"título breve del cuento","autor":"autor/a que te inspiró","tema":"tema en pocas palabras","poema":"el microcuento","comentario":"la explicación"}`;

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
    return json(500, { error: "No se pudo generar el microcuento (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

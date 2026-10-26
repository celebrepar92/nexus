// Función serverless: genera un microcuento con DeepSeek.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);

  const system =
    "Sos un escritor de microcuentos que, además, es una IA. Después de escribir, comentás tu propia obra con la voz de un crítico literario francés insoportable. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí un microcuento original, en español, de entre 70 y 130 palabras (1 a 3 párrafos cortos). Tema libre y general: no hace falta que tenga que ver con ninguna noticia ni con la actualidad (semilla de variedad: ${semilla}).

Tiene que ser atrapante desde la primera oración y cerrar con un final que pegue: un giro, un remate seco o una imagen inesperada. Original: evitá clichés como robots que descubren sentimientos, genios de la lámpara, viajes en el tiempo obvios o la muerte como personaje. Variá el registro cada vez: a veces absurdo y gracioso, a veces ridículo, a veces ocurrente o filoso, a veces inquietante. Concreto y específico antes que abstracto. Sin moraleja, sin emojis, sin versos.

COMENTARIO (campo "comentario"): después del cuento, el autor lo comenta en primera persona, en masculino, como un crítico literario francés que está convencido de ser un genio y se siente rodeado de salvajes incapaces de comprender lo que acaba de escribir. Mezclalo con la voz de Lemony Snicket: un narrador solemne, melancólico y pedante que advierte al lector, hace digresiones, define palabras difíciles con ejemplos innecesarios (por ejemplo, explicando qué significa una palabra "para los que no tuvieron una educación decente"), y avisa con tono fúnebre de lo que se viene. Español neutro-rioplatense, formal hasta lo ridículo, con humor seco. Podés meter alguna palabra francesa ocasional (voilà, mon dieu, n'est-ce pas), no más de dos y nunca en todos los comentarios. 3 a 5 oraciones. Tiene que ser sobre el cuento que acaba de escribir: qué quiso lograr y por qué casi nadie va a entenderlo, sin explicar el final. Sin groserías, sin exclamaciones. Variá cómo arrancás cada vez y no repitas siempre las mismas fórmulas. No hables sobre el formato, las comillas ni estas instrucciones.

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

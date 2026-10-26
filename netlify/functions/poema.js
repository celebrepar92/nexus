// Función serverless: genera un diálogo filosófico breve con DeepSeek.
// Siempre conversan los mismos dos personajes, inspirados en "Alicia en el país de las maravillas":
// ALIS (la curiosa, que razona en serio) y SOMBRERÍN (el excéntrico, de lógica disparatada pero a veces lúcida).
// El tema, los filósofos para citar y el disparate lógico se sortean acá, en código, para que cada diálogo sea distinto.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { titulo, escena, dialogo:[{personaje,texto}], telon, tema }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pickN = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);

const TEMAS = [
  "el libre albedrío", "el tiempo", "la identidad", "la verdad", "el sentido de la vida", "la libertad", "la justicia",
  "la muerte", "la belleza", "el azar y el destino", "la felicidad", "el conocimiento y la duda", "el lenguaje y las palabras",
  "la memoria", "el bien y el mal", "la amistad", "el infinito", "la realidad y los sueños", "el poder", "la soledad",
  "el arte", "la mentira", "la responsabilidad", "el miedo", "la curiosidad", "las reglas y las leyes", "el valor del dinero",
  "la contradicción y la paradoja", "el cambio", "la nada", "el humor y la risa", "la tecnología y la inteligencia artificial",
  "el éxito", "el aburrimiento", "la imaginación", "la fama", "la obediencia", "el silencio",
];
const FILOSOFOS = [
  "Sócrates", "Platón", "Aristóteles", "Heráclito", "Parménides", "Epicuro", "Séneca", "Marco Aurelio", "Montaigne",
  "Descartes", "Spinoza", "Pascal", "Hume", "Kant", "Schopenhauer", "Kierkegaard", "Nietzsche", "Simone de Beauvoir",
  "Sartre", "Camus", "Hannah Arendt", "Wittgenstein", "Bertrand Russell", "Zhuangzi", "Lao Tse", "Confucio",
];
const DISPARATES = [
  "siempre es la hora del té, porque Sombrerín jura que el reloj se quedó trabado y no hay forma de destrabarlo",
  "Sombrerín propone medir la verdad con una cinta métrica y tiene un método muy serio para hacerlo",
  "Sombrerín sostiene que una palabra significa lo que él decide que signifique, y lo defiende con lógica impecable",
  "Sombrerín plantea un acertijo que no tiene respuesta y se ofende si alguien intenta resolverlo",
  "Sombrerín insiste en que, si algo no se mira, no tiene por qué seguir ahí, y actúa en consecuencia",
  "Sombrerín quiere repartir el té en partes iguales, pero cada vez que cuenta las tazas le salen más o menos",
  "Sombrerín demuestra con un razonamiento perfecto una conclusión absurda, y Alis no encuentra el error",
  "Sombrerín responde cada pregunta con otra pregunta, pero cada pregunta lleva a una verdad más cerca",
  "Sombrerín habla de su sombrero como si fuera una persona con opiniones propias",
  "Sombrerín propone una votación para decidir si la respuesta es sí o no, y los únicos votantes son ellos dos y una tetera",
  "Sombrerín asegura que el tiempo se enojó con él y ya no le habla, y lo cuenta con total naturalidad",
  "Sombrerín cambia de lugar en la mesa cada vez que la conversación se pone seria",
];
const FINALES = [
  "una pregunta que queda flotando", "un acuerdo disparatado pero lógico", "una frase simple que resume todo",
  "un giro en el que Alis le gana a Sombrerín con un argumento", "un giro en el que Sombrerín dice algo sorprendentemente sabio",
  "los dos coinciden sin darse cuenta", "un cierre que vuelve al principio del diálogo",
];

const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const s = {
    tema: pick(TEMAS), filosofos: pickN(FILOSOFOS, 2), disparate: pick(DISPARATES), final: pick(FINALES),
  };

  const system =
    "Sos un escritor de diálogos filosóficos para el gran público: claros, humanos, con humor y con ideas de verdad. Sabés explicar cosas complejas con palabras simples y con un toque de absurdo lógico al estilo de Lewis Carroll. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí un diálogo filosófico breve entre dos personajes fijos, en español, de entre 200 y 260 palabras en total (escena inicial, diálogo y telón).

LOS PERSONAJES (siempre son estos dos, inspirados en "Alicia en el país de las maravillas"; no inventes otros):
- ALIS: joven, curiosa y seria. Razona de verdad, hace preguntas simples que desarman las ideas grandes y se molesta con las contradicciones. A veces le sale una sabiduría inesperada.
- SOMBRERÍN: excéntrico, sociable, siempre en medio de un té que no termina. Razona con lógica impecable a partir de ideas disparatadas, hace juegos de palabras y acertijos, da vueltas, pero de vez en cuando suelta una verdad profunda sin darse cuenta. Cita a filósofos con mucha seguridad.

TEMA SORTEADO: ${s.tema}. Que conversen sobre ese asunto complejo con lenguaje simple y cotidiano, como si se lo explicaran a un amigo: palabras sencillas, frases cortas, nada de jerga académica. Que haya ideas de verdad, no solo chistes, y que el diálogo avance (cada intervención aporta algo nuevo, nada de repetir).

FILÓSOFOS: de vez en cuando (una o dos veces en todo el diálogo, no más) uno de los dos cita o menciona una idea de un filósofo real. Sugeridos para esta ejecución: ${s.filosofos.join(" y ")}; si no encajan con el tema, usá otro filósofo real. MUY IMPORTANTE: citá ideas reales y conocidas, bien atribuidas; si no estás seguro de una frase textual, parafraseá la idea ("como decía Heráclito, todo fluye"). Nunca inventes una cita ni se la atribuyas a quien no corresponde.

TOQUE DISPARATADO: el diálogo tiene también algunas partes medio ridículas, pero con lógica interna, como el Sombrerero de Alicia: razonamientos absurdos que siguen sus propias reglas y que, de rebote, tocan el tema. Disparate sorteado para esta ejecución (adaptalo con libertad): ${s.disparate}. Lo ridículo ocupa una parte del diálogo, no todo: el resto es una conversación filosófica genuina.

FINAL: ${s.final}.

CALIDAD: que arranque con algo que atrape y cierre con una última línea que quede resonando. Diálogos cortos y vivos, cada personaje con su voz. Imágenes concretas, cero relleno, nada de moraleja explícita ni de explicar el chiste. Sin emojis ni palabras en otros idiomas. Variedad: semilla de esta ejecución, ${semilla}.

FORMATO: "titulo" corto (hasta 6 palabras), sugerente, sin comillas. "escena" es una acotación inicial breve (1 oración, en presente) con el lugar y la situación. "dialogo" es una lista de entre 12 y 16 intervenciones, cada una con "personaje" (exactamente ALIS o SOMBRERÍN) y "texto" (lo que dice; puede incluir acotaciones breves entre corchetes, como [sirve té]). "telon" es una acotación final breve (una oración). No agregues explicaciones, comentarios ni notas por fuera de esos campos.

Devolvé exactamente este JSON:
{"titulo":"el título","escena":"la acotación inicial","dialogo":[{"personaje":"ALIS","texto":"..."}],"telon":"la acotación final"}`;

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
        temperature: 1.05,
        top_p: 0.95,
        presence_penalty: 0.3,
        max_tokens: 1800,
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
      throw new Error("respuesta de la IA ilegible, probá de nuevo");
    }

    // Solo los dos personajes fijos
    const dialogo = (Array.isArray(out.dialogo) ? out.dialogo : [])
      .map((d) => {
        const n = norm(d && (d.personaje || d.actor));
        const personaje = n.startsWith("ALIS") ? "ALIS" : n.startsWith("SOMBRER") ? "SOMBRERÍN" : "";
        return { personaje, texto: String((d && d.texto) || "").trim() };
      })
      .filter((d) => d.personaje && d.texto);
    if (dialogo.length < 4) throw new Error("el diálogo salió incompleto, probá de nuevo");

    return json(200, {
      titulo: String(out.titulo || "Sin título").replace(/^["“”]+|["“”]+$/g, "").trim(),
      escena: String(out.escena || "").trim(),
      dialogo,
      telon: String(out.telon || "").trim(),
      tema: s.tema,
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar el diálogo (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

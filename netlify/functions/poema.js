// Función serverless: genera un diálogo filosófico breve con DeepSeek (solo diálogo, sin formato de obra).
// Siempre conversan los mismos dos personajes, de nombres parecidos y personalidades contrastantes:
// DUDO (el escéptico, cuidadoso, que lo cuestiona todo) y DADO (el impulsivo, ocurrente, de lógica disparatada).
// El tema, quién arranca, los filósofos para citar y el disparate lógico se sortean acá, en código, para que cada diálogo sea distinto.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { dialogo:[{personaje,texto}], tema }

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
// Disparates con lógica interna, en el espíritu de Lewis Carroll pero propios (nada de té, sombreros, relojes ni reinas).
const DISPARATES = [
  "Dado propone medir la verdad con una cinta métrica y tiene un método muy serio para hacerlo",
  "Dado jura que si cierra los ojos el problema se achica, y lo demuestra con un razonamiento que Dudo no puede rebatir",
  "Dado quiere resolver el asunto con una votación, pero los únicos votantes son ellos dos y una silla",
  "Dado sostiene que una idea se le perdió en algún bolsillo y se pone a buscarla con total seriedad",
  "Dado plantea un acertijo que no tiene respuesta y se ofende si alguien intenta resolverlo",
  "Dado demuestra con una lógica impecable una conclusión absurda, y Dudo no encuentra el error",
  "Dado responde cada pregunta con otra pregunta, pero cada pregunta lo acerca más a una verdad",
  "Dado asegura que el tiempo es un animal que hay que alimentar para que no se escape",
  "Dado propone firmar un contrato con la luna para zanjar la discusión, y detalla las cláusulas",
  "Dado afirma que las preguntas difíciles se resuelven dándoles la vuelta, y las da vuelta literalmente",
  "Dado cuenta cuántas cosas hay en la conversación y cada vez le da un número distinto, siempre con razones",
  "Dado inventa una palabra nueva para el asunto y se pone a defender su definición como si fuera de diccionario",
];
const FINALES = [
  "una pregunta que queda flotando", "un acuerdo disparatado pero lógico", "una frase simple que resume todo",
  "un giro en el que Dudo termina convencido por la lógica de Dado", "un giro en el que Dado dice algo sorprendentemente sabio",
  "los dos coinciden sin darse cuenta", "un cierre que vuelve a la primera frase del diálogo",
];

const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
// Sin corchetes, paréntesis ni acciones entre asteriscos: solo lo que dicen
const limpiar = (t) =>
  String(t || "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\*[^*]*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const s = {
    tema: pick(TEMAS), filosofos: pickN(FILOSOFOS, 2), disparate: pick(DISPARATES), final: pick(FINALES),
    arranca: pick(["DUDO", "DADO"]),
  };

  const system =
    "Sos un escritor de diálogos filosóficos para el gran público: claros, humanos, con humor y con ideas de verdad. Sabés explicar cosas complejas con palabras simples y con un toque de absurdo lógico al estilo de Lewis Carroll, sin copiarlo. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí un diálogo filosófico breve entre dos personajes fijos, en español, de entre 200 y 260 palabras en total. Es solamente una conversación: sin escena, sin acotaciones, sin descripciones de acciones, sin narrador, sin corchetes ni paréntesis, sin asteriscos. Solo lo que dicen, nada más.

LOS PERSONAJES (siempre son estos dos; no inventes otros). Sus nombres se parecen entre sí, como Rómulo y Remo, y sus personalidades son opuestas:
- DUDO: escéptico, cuidadoso y serio. Duda de todo, pide definiciones, desarma las afirmaciones apuradas y es melancólico. Lee mucho y es quien cita a los filósofos. Le cuesta reconocer que lo está pasando bien.
- DADO: impulsivo, optimista y ocurrente. Dice lo primero que piensa, saca conclusiones a toda velocidad y razona con una lógica disparatada pero con reglas propias, como la de los personajes de Lewis Carroll. De vez en cuando, sin darse cuenta, dice algo muy profundo.
Hablan con confianza, como dos amigos que se conocen de toda la vida y no se ponen de acuerdo en nada. No menciones la relación entre los nombres.

INSPIRACIÓN: el espíritu de "Alicia en el país de las maravillas" (lógica disparatada, juegos de palabras, acertijos), pero propio y original. Nada de escenarios, objetos ni personajes del libro: ni té, ni sombreros, ni relojes de bolsillo, ni gatos que desaparecen, ni reinas, ni conejos.

TEMA SORTEADO: ${s.tema}. Que conversen sobre ese asunto complejo con lenguaje simple y cotidiano, como si se lo explicaran a un amigo: palabras sencillas, frases cortas, nada de jerga académica. Que haya ideas de verdad, no solo chistes, y que el diálogo avance (cada intervención aporta algo nuevo, nada de repetir). Empieza hablando ${s.arranca}.

FILÓSOFOS: de vez en cuando (una o dos veces en todo el diálogo, no más) uno de los dos cita o menciona una idea de un filósofo real. Sugeridos para esta ejecución: ${s.filosofos.join(" y ")}; si no encajan con el tema, usá otro filósofo real. MUY IMPORTANTE: citá ideas reales y conocidas, bien atribuidas; si no estás seguro de una frase textual, parafraseá la idea ("como decía Heráclito, todo fluye"). Nunca inventes una cita ni se la atribuyas a quien no corresponde.

TOQUE DISPARATADO: el diálogo tiene también algunas partes medio ridículas, pero con lógica interna, de modo que lo absurdo siga reglas propias y, de rebote, toque el tema. Disparate sorteado para esta ejecución (adaptalo con libertad): ${s.disparate}. Lo ridículo ocupa una parte del diálogo, no todo: el resto es una conversación filosófica genuina.

FINAL: ${s.final}.

CALIDAD: que arranque con algo que atrape y cierre con una última línea que quede resonando. Diálogos cortos y vivos, cada personaje con su voz. Imágenes concretas, cero relleno, nada de moraleja explícita ni de explicar el chiste. Sin emojis ni palabras en otros idiomas. Variedad: semilla de esta ejecución, ${semilla}.

FORMATO: "dialogo" es una lista de entre 12 y 16 intervenciones, cada una con "personaje" (exactamente DUDO o DADO) y "texto" (lo que dice, nada más). No agregues título, explicaciones, comentarios ni notas.

Devolvé exactamente este JSON:
{"dialogo":[{"personaje":"${s.arranca}","texto":"..."}]}`;

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
        max_tokens: 1600,
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

    // Solo los dos personajes fijos, y solo lo que dicen
    const dialogo = (Array.isArray(out.dialogo) ? out.dialogo : [])
      .map((d) => {
        const n = norm(d && (d.personaje || d.actor));
        const personaje = n.startsWith("DUDO") ? "DUDO" : n.startsWith("DADO") ? "DADO" : "";
        return { personaje, texto: limpiar(d && d.texto) };
      })
      .filter((d) => d.personaje && d.texto);
    if (dialogo.length < 4) throw new Error("el diálogo salió incompleto, probá de nuevo");

    return json(200, { dialogo, tema: s.tema });
  } catch (e) {
    return json(500, { error: "No se pudo generar el diálogo (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

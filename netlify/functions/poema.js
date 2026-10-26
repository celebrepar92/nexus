// Función serverless: genera una obra de teatro breve y clara (un microrrelato en formato de guion), con DeepSeek.
// Los personajes los inventa la IA en cada obra. El tono imita a un dramaturgo sorteado al azar,
// y al final la IA agrega un breve comentario propio.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { titulo, escena, dialogo:[{personaje,texto}], telon, comentario, autor }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Se sortea acá, en código, para que cada obra sea distinta. Pocas semillas y simples, para que la obra se entienda.
const AUTORES = [
  "William Shakespeare", "Antón Chéjov", "Molière", "Oscar Wilde", "George Bernard Shaw", "Arthur Miller",
  "Tennessee Williams", "Armando Discépolo", "Roberto Cossa", "Federico García Lorca", "Henrik Ibsen", "Neil Simon",
  "Ricardo Talesnik", "Alejandro Casona", "Friedrich Dürrenmatt", "Lope de Vega", "Sófocles", "Aristófanes",
  "Eugene O'Neill", "Bertolt Brecht", "Mauricio Kartun", "Dario Fo", "Edmond Rostand", "Carlo Goldoni",
];
const GENEROS = [
  "comedia", "drama íntimo", "tragedia breve", "comedia romántica", "sainete rioplatense", "fábula",
  "suspenso", "drama familiar", "humor negro suave", "comedia de enredos",
];
const ESCENARIOS = [
  "una sala de espera", "una cocina a medianoche", "una pensión", "un bar a la hora de cierre", "una plaza un domingo",
  "un consultorio", "una estación de tren", "un taller", "un cumpleaños", "una peluquería", "una oficina",
  "una terraza", "un velorio", "un tribunal chico", "una casa que se vende", "un hospital de noche",
];
const SITUACIONES = [
  "alguien tiene que contar una verdad difícil", "dos viejos amigos se reencuentran después de años", "una promesa que cuesta cumplir",
  "una mentira chica que se vuelve enorme", "una despedida que nadie quiere hacer", "una decisión que no se puede postergar más",
  "un malentendido que se aclara demasiado tarde", "una oferta inesperada que cambia todo", "un secreto de familia sale a la luz",
  "alguien pide perdón y no sabe cómo", "dos personas se disputan algo que ninguna quiere de verdad", "un desconocido trae una noticia",
  "alguien descubre algo sobre sí mismo", "una deuda vieja que hay que saldar", "un regreso que nadie esperaba",
];
const FINALES = [
  "un giro inesperado pero coherente", "una frase que cambia el sentido de todo", "un cierre irónico", "un final tierno",
  "un final seco y contundente", "una revelación sencilla", "un final abierto pero comprensible",
];

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const s = {
    autor: pick(AUTORES), genero: pick(GENEROS), escenario: pick(ESCENARIOS),
    situacion: pick(SITUACIONES), final: pick(FINALES),
  };

  const system =
    "Sos un dramaturgo que escribe obras breves, claras y bien construidas. Tus diálogos son naturales, con subtexto, y cualquier lector entiende la historia a la primera lectura. Sabés capturar el tono de otros dramaturgos sin copiarlos. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí una obra de teatro breve (un microrrelato en formato de guion, un solo acto y una sola escena), en español, original, entretenida y muy bien escrita, de entre 150 y 200 palabras en total (escena inicial, diálogo y telón).

CLARIDAD (lo más importante): que se entienda a la primera lectura. Una sola situación, un conflicto claro y un cierre que se comprenda. Entre 2 y 3 personajes que vos inventás, con nombres propios simples, cada uno con una voz distinta y un deseo claro. Lenguaje cotidiano, frases cortas. Nada de absurdo, surrealismo ni confusión, salvo que el género lo pida de forma sutil. Los hechos tienen que tener lógica de principio a fin.

TONO: ${s.autor}. Escribí en su estilo: su manera de armar un diálogo, su ritmo y su forma de cerrar. Es un homenaje al estilo, no una copia: nada de frases, escenas ni personajes reales de ese autor, y no lo nombres dentro de la obra.

SEMILLAS SORTEADAS (usalas como base y adaptalas con libertad): género ${s.genero}; escenario ${s.escenario}; situación: ${s.situacion}; final con ${s.final}.

CALIDAD: que arranque con algo que atrape y cierre con una última línea que quede resonando. Diálogos cortos y filosos, con subtexto. Imágenes concretas, cero relleno, nada de moraleja explícita. Evitá los clichés. Sin emojis ni palabras en otros idiomas. Variedad: semilla de esta ejecución, ${semilla}; no uses nombres ni títulos comunes.

FORMATO: "escena" es una acotación inicial breve (1 o 2 oraciones) con el lugar y la situación, en presente. "dialogo" es una lista de entre 8 y 14 intervenciones, cada una con "personaje" (nombre del personaje, igual en todas sus intervenciones) y "texto" (lo que dice; puede incluir acotaciones breves entre corchetes, como [se sienta]). "telon" es una acotación final breve (una oración). El "titulo" es corto (hasta 6 palabras), sugerente, sin comillas y sin el nombre del dramaturgo.

COMENTARIO DE LA IA: debajo de la obra, escribí en primera persona un breve comentario tuyo, como el dramaturgo que acaba de escribirla (2 o 3 oraciones, máximo 45 palabras): qué intentaste hacer con el tono de ${s.autor}, qué decisión tomaste o qué te costó o te divirtió. Honesto, con un toque de humor seco o de humildad, sin autoelogios y sin spoilear el final. Sin comillas ni saludos.

Devolvé exactamente este JSON:
{"titulo":"el título","escena":"la acotación inicial","dialogo":[{"personaje":"NOMBRE","texto":"..."}],"telon":"la acotación final","comentario":"el comentario de la IA"}`;

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
        temperature: 0.95,
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

    const dialogo = (Array.isArray(out.dialogo) ? out.dialogo : [])
      .map((d) => ({
        personaje: String((d && (d.personaje || d.actor)) || "").trim(),
        texto: String((d && d.texto) || "").trim(),
      }))
      .filter((d) => d.personaje && d.texto);
    if (dialogo.length < 3) throw new Error("la obra salió incompleta, probá de nuevo");

    return json(200, {
      titulo: String(out.titulo || "Sin título").replace(/^["“”]+|["“”]+$/g, "").trim(),
      escena: String(out.escena || "").trim(),
      dialogo,
      telon: String(out.telon || "").trim(),
      comentario: String(out.comentario || "").trim(),
      autor: s.autor,
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar la obra (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

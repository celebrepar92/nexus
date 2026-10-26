// Función serverless: genera una obra de teatro en miniatura (un microrrelato en formato de guion), con DeepSeek.
// Siempre actúa la misma compañía de cuatro actores, cada uno interpretando un papel distinto en cada obra.
// El tono de cada obra imita a un dramaturgo sorteado al azar, y al final la IA agrega un breve comentario propio.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { titulo, escena, dialogo:[{actor,papel,texto}], telon, comentario, autor, compania }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const COMPANIA = "El Telón Remendado";

// La compañía fija. Son siempre los mismos cuatro, y en cada obra hacen de otros personajes.
const ELENCO = [
  {
    id: "ARMANDO", nombre: "Armando Bellido", edad: 67, rol: "primer actor",
    bio: "Veterano de la vieja escuela, voz de trueno, convencido de que cualquier papel chico es una injusticia. Hace pausas dramáticas innecesarias, cita a 'el Maestro' (que nadie conoce) y no escucha bien pero lo disimula. Aunque haga de mozo, habla como un rey.",
  },
  {
    id: "MIRTA", nombre: "Mirta Sosa", edad: 58, rol: "primera actriz",
    bio: "Melodramática: llora a pedido y sin pedido, y todo lo que dice suena a despedida. Rival de Armando desde 1989 por un aplauso que se discutieron. Sabe secretos de todos y los insinúa con una sonrisa. Siempre busca la luz del reflector.",
  },
  {
    id: "TEO", nombre: "Teo Ferreyra", edad: 22, rol: "actor becario",
    bio: "Nervioso y entusiasta, aprende en vivo. Se confunde de texto, sobreexplica y hace preguntas que rompen la escena; a veces dice la verdad sin querer. Siempre le toca el papel más ridículo (el árbol, el cadáver, el perro).",
  },
  {
    id: "DORA", nombre: "Dora Quiroga", edad: 45, rol: "actriz y apuntadora",
    bio: "Práctica, seca y sarcástica. Maneja la utilería y la plata de la compañía. Corrige a los demás desde el costado del escenario y a veces la apuntan a ella. Actúa sin ganas y le sale mejor que a todos.",
  },
];

// Todo esto se sortea acá, en código, porque si se lo dejamos elegir a la IA termina repitiendo siempre lo mismo.
const AUTORES = [
  "William Shakespeare", "Antón Chéjov", "Samuel Beckett", "Eugène Ionesco", "Luigi Pirandello", "Federico García Lorca",
  "Molière", "Oscar Wilde", "Bertolt Brecht", "Arthur Miller", "Tennessee Williams", "Harold Pinter",
  "Armando Discépolo", "Griselda Gambaro", "Roberto Cossa", "Eduardo Pavlovsky", "Copi", "Calderón de la Barca",
  "Lope de Vega", "Sófocles", "Aristófanes", "Eugene O'Neill", "Edward Albee", "Tom Stoppard", "Dario Fo",
  "Ramón del Valle-Inclán", "Henrik Ibsen", "August Strindberg", "Mauricio Kartun", "Alejandro Casona",
  "Jean Genet", "Neil Simon", "Ricardo Talesnik", "Jean-Paul Sartre", "George Bernard Shaw", "Friedrich Dürrenmatt",
];
const GENEROS = [
  "comedia de enredos", "tragedia en miniatura", "drama familiar", "farsa", "teatro del absurdo", "melodrama exagerado",
  "policial de salón", "sainete rioplatense", "fantasmas", "ciencia ficción de bajo presupuesto", "fábula", "comedia romántica",
  "drama de época", "parodia de un clásico", "tragicomedia", "misterio en un solo ambiente",
];
const ESCENARIOS = [
  "una sala de espera", "un castillo con goteras", "una pensión de provincia", "un barco que no zarpa", "una cocina a medianoche",
  "un tribunal improvisado", "un ascensor trabado", "un velorio con mala organización", "una estación de tren desierta",
  "un hotel donde nadie se va", "un cumpleaños que sale mal", "un cementerio de barrio", "una isla desierta con wifi",
  "un consultorio", "una peluquería", "un bar de esquina a la hora de cierre", "una plaza un domingo", "una biblioteca prohibida",
  "una oficina pública", "un velero en una botella gigante",
];
const PREMISAS = [
  "alguien tiene que decir una verdad y nadie quiere escucharla", "una herencia que nadie quiere cobrar", "un invitado que no figura en la lista",
  "una promesa que se cumple demasiado literalmente", "un secreto que todos conocen menos uno", "una despedida que se posterga una y otra vez",
  "un objeto perdido que aparece en el peor momento", "un malentendido que crece", "dos personas esperan algo que no llega",
  "alguien descubre que lleva años repitiendo el mismo día", "un juicio por algo ridículo tratado con total seriedad", "una declaración de amor interrumpida",
  "un brindis que sale mal", "una mudanza que revela algo", "un cambio de roles inesperado", "un trato que se complica con cada cláusula",
];
const UTILERIA = [
  "una silla que cojea", "un teléfono sin cable", "una corona de cartón", "una escalera", "un baúl cerrado", "una valija",
  "una lámpara que parpadea", "un reloj que no marca la hora", "una carta lacrada", "un paraguas", "una máscara", "un espejo de mano",
  "una tetera", "una calavera de utilería", "un telón que se traba", "una campanilla", "una bandeja con tortas",
];
const INCIDENTES = [
  "se corta la luz un instante", "se cae una parte del decorado", "alguien se olvida el texto y lo improvisa", "suena un teléfono en la platea",
  "un actor entra por la puerta equivocada", "se rompe un accesorio clave", "el apuntador (Dora) se mete sin querer en la escena",
  "falta un accesorio y lo reemplazan con lo que hay", "nadie se acuerda de cómo termina la obra", "alguien actúa demasiado y arruina un momento serio",
];
const FINALES = [
  "un giro inesperado", "una frase que cambia el sentido de todo", "un final abierto que inquieta", "un cierre irónico",
  "un final tierno", "un final seco, casi brusco", "una revelación mínima", "un final que vuelve al principio", "un final donde el telón cae antes de tiempo",
];

const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const s = {
    autor: pick(AUTORES), genero: pick(GENEROS), escenario: pick(ESCENARIOS), premisa: pick(PREMISAS),
    utileria: pick(UTILERIA), incidente: pick(INCIDENTES), final: pick(FINALES),
  };

  const elencoTxt = ELENCO.map((a) => `- ${a.id} (${a.nombre}, ${a.edad} años, ${a.rol}): ${a.bio}`).join("\n");

  const system =
    "Sos el dramaturgo residente de la compañía de teatro independiente 'El Telón Remendado'. Escribís obras breves, graciosas y muy bien escritas, con diálogos vivos y precisos, y sabés capturar el tono de otros dramaturgos sin copiarlos. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí una obra de teatro en miniatura (un microrrelato en formato de guion, en un solo acto y una sola escena), en español, original, entretenida y muy bien escrita. En total, entre 150 y 200 palabras entre la escena inicial, el diálogo y el telón.

LA COMPAÑÍA (siempre son estos cuatro actores, no inventes otros; los cuatro participan en cada obra, aunque alguno hable poco):
${elencoTxt}

REGLA CLAVE: en esta obra cada actor interpreta a un PERSONAJE distinto de sí mismo (por ejemplo un rey, un fantasma, un mozo, una viuda, un juez, un perro, una planta, un funcionario, un enamorado…). Vos elegís los papeles de hoy, de modo que encajen con la obra. Nunca se interpretan a sí mismos. Pero la personalidad real de cada actor se filtra siempre en su personaje: Armando grandilocuente aunque sea un mozo, Mirta lagrimeando aunque sea un juez, Teo confundiéndose o diciendo la verdad sin querer, Dora corrigiendo o resolviendo todo con sequedad. Ese choque entre el actor y el personaje es la gracia de la obra.

DRAMATURGO SORTEADO: ${s.autor}. Escribí en su tono: su manera de armar un diálogo, su ritmo, sus obsesiones y su forma de cerrar. Es un homenaje al estilo, no una copia: nada de frases, escenas ni personajes reales de ese autor, y no lo nombres dentro de la obra.

SEMILLAS SORTEADAS (usalas como punto de partida y transformalas con libertad; si alguna no encaja con el tono del dramaturgo, adaptala): género ${s.genero}; escenario ${s.escenario}; conflicto: ${s.premisa}; objeto de utilería: ${s.utileria}; durante la función ${s.incidente}; final con ${s.final}.

FORMATO: "escena" es una acotación inicial breve (1 o 2 oraciones) que describe el lugar y la situación, en presente y sin nombrar actores. "dialogo" es una lista de entre 10 y 14 intervenciones, donde cada una tiene "actor" (exactamente ARMANDO, MIRTA, TEO o DORA), "papel" (el personaje que interpreta en esta obra, en minúscula, de una a tres palabras) y "texto" (lo que dice; puede incluir acotaciones breves entre corchetes, como [se arrodilla]). "telon" es una acotación final breve (una oración) con la que cae el telón. Sin emojis ni palabras en otros idiomas.

CALIDAD: que arranque con algo que atrape y cierre con una última línea que quede resonando. Diálogos cortos y filosos, con subtexto, cada personaje con voz propia. Imágenes concretas antes que abstracciones, cero relleno. Nada de moraleja explícita ni de explicar el chiste. Evitá los clichés. Que sea una obra completa, con principio, conflicto y cierre, aunque sea mínima. Variedad: esta es la semilla de esta ejecución, ${semilla}; no repitas nombres de personaje ni títulos comunes.

TÍTULO: corto (hasta 6 palabras), sugerente, sin comillas y sin el nombre del dramaturgo.

COMENTARIO DE LA IA: debajo de la obra, escribí en primera persona un breve comentario tuyo, como el dramaturgo que acaba de escribirla (de 2 a 3 oraciones y no más de 45 palabras): qué intentaste hacer con el tono de ${s.autor}, qué papel le tocó a quién y por qué, o qué te costó o te divirtió. Honesto, con un toque de humor seco o de humildad, sin autoelogios y sin spoilear el final. Sin comillas ni saludos.

Devolvé exactamente este JSON:
{"titulo":"el título","escena":"la acotación inicial","dialogo":[{"actor":"ARMANDO","papel":"el rey","texto":"..."}],"telon":"la acotación final","comentario":"el comentario de la IA"}`;

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
        temperature: 1.2,
        top_p: 0.95,
        presence_penalty: 0.5,
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

    // Normaliza el diálogo: solo actores de la compañía, con texto
    const ids = ELENCO.map((a) => a.id);
    const dialogo = (Array.isArray(out.dialogo) ? out.dialogo : [])
      .map((d) => {
        const id = norm(d && d.actor);
        return {
          actor: ids.includes(id) ? id : id.split(/\s+/)[0] || "",
          papel: String((d && d.papel) || "").trim().replace(/^[("]+|[)"]+$/g, ""),
          texto: String((d && d.texto) || "").trim(),
        };
      })
      .filter((d) => d.actor && d.texto);
    if (dialogo.length < 3) throw new Error("la obra salió incompleta, probá de nuevo");

    return json(200, {
      titulo: String(out.titulo || "Sin título").replace(/^["“”]+|["“”]+$/g, "").trim(),
      escena: String(out.escena || "").trim(),
      dialogo,
      telon: String(out.telon || "").trim(),
      comentario: String(out.comentario || "").trim(),
      autor: s.autor,
      compania: COMPANIA,
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar la obra (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

// Función serverless: genera un microrrelato nuevo en cada llamada, escrito por la IA (DeepSeek)
// en el tono de un autor sorteado al azar, más un breve comentario de la propia IA sobre lo que escribió.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { titulo, texto, comentario, autor }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Todo esto se sortea acá, en código, porque si se lo dejamos elegir a la IA termina repitiendo siempre lo mismo.
const AUTORES = [
  "Jorge Luis Borges", "Julio Cortázar", "Augusto Monterroso", "Franz Kafka", "Edgar Allan Poe", "Antón Chéjov",
  "Ernest Hemingway", "Raymond Carver", "Clarice Lispector", "Juan Rulfo", "Adolfo Bioy Casares", "Silvina Ocampo",
  "Felisberto Hernández", "Samanta Schweblin", "Mariana Enriquez", "Roberto Arlt", "Horacio Quiroga", "Ray Bradbury",
  "Italo Calvino", "H. P. Lovecraft", "Raymond Chandler", "Alice Munro", "Juan José Arreola", "Ana María Shua",
  "Marco Denevi", "Gabriel García Márquez", "Julio Ramón Ribeyro", "Dino Buzzati", "Mark Twain", "Oscar Wilde",
  "Daniil Jarms", "Patricia Highsmith", "Shirley Jackson", "Haruki Murakami", "Lydia Davis", "Etgar Keret",
  "Roald Dahl", "Saki (H. H. Munro)", "Ambrose Bierce", "O. Henry", "Angélica Gorodischer", "Liliana Heker",
  "Roberto Fontanarrosa", "Hernán Casciari", "Rodolfo Walsh", "Leonora Carrington", "Isaac Asimov", "Philip K. Dick",
  "Flannery O'Connor", "Jorge Ibargüengoitia", "Álvaro Mutis", "Virginia Woolf", "Stefan Zweig", "Bruno Schulz",
  "Natalia Ginzburg", "Rosa Montero", "Eduardo Galeano", "Ursula K. Le Guin",
];
const GENEROS = [
  "fantástico", "realismo sucio", "ciencia ficción", "policial", "humor absurdo", "terror sutil", "drama íntimo",
  "fábula con moraleja torcida", "realismo mágico", "relato de amor imposible", "relato de aventuras", "comedia de enredos",
  "relato metaliterario", "relato filosófico", "melancolía cotidiana", "western", "relato de fantasmas", "distopía mínima",
];
const OBJETOS = [
  "un reloj que se detiene", "una llave de origen desconocido", "un paraguas olvidado", "una carta sin abrir", "un espejo rajado",
  "una valija vacía", "un teléfono que suena", "un mapa incompleto", "una escalera", "un perro sin dueño", "una radio vieja",
  "un sobre con dinero", "una foto rota", "un tren que no figura en los horarios", "una vela", "un libro con una página arrancada",
  "una puerta cerrada con candado", "un disfraz", "una semilla", "una campana", "una bicicleta oxidada", "un cuaderno de cuentas",
  "una mesa para dos", "un gato en una ventana", "una moneda", "una torta de cumpleaños", "una linterna", "un par de zapatos gastados",
];
const LUGARES = [
  "un pueblo en la frontera", "un edificio de departamentos", "una estación de servicio en la ruta", "un hospital de madrugada",
  "una biblioteca cerrada", "un barco a la deriva", "un desierto", "un casino de provincia", "una escuela rural", "un hotel casi vacío",
  "un cementerio de barrio", "una isla pequeña", "una ciudad inundada", "un teatro después de la función", "una casa heredada",
  "un tren nocturno", "un bar de esquina", "una peluquería", "un faro", "un taller mecánico", "un velorio", "un aeropuerto con niebla",
  "una selva", "una terraza", "un ascensor", "un cumpleaños de quince", "una playa en invierno", "una cocina a las tres de la mañana",
];
const PERSONAJES = [
  "un viejo que miente bien", "una niña demasiado seria", "un empleado de oficina cansado", "una mujer que espera a alguien",
  "un forastero", "dos hermanos peleados", "un médico sin pacientes", "una abuela con un secreto", "un vendedor sin suerte",
  "un músico retirado", "un soldado que volvió", "una pareja a punto de separarse", "un fantasma educado", "un detective jubilado",
  "un viajero que perdió el rumbo", "un carnicero filosófico", "una cantante olvidada", "un cartero", "un relojero", "un niño con una pregunta difícil",
];
const FINALES = [
  "un giro inesperado", "una frase que cambia el sentido de todo", "un final abierto que inquieta", "un cierre irónico",
  "un final tierno", "un final seco, casi brusco", "una revelación mínima", "un final cíclico que vuelve al principio",
  "un final que no explica nada y lo dice todo",
];
const NARRADORES = [
  "primera persona", "tercera persona cercana", "tercera persona distante", "segunda persona (el 'vos' o el 'tú' al lector o al personaje)",
  "narrador testigo", "narrador que se corrige a sí mismo", "formato de carta o nota", "narrador colectivo ('nosotros')",
];

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const s = {
    autor: pick(AUTORES), genero: pick(GENEROS), objeto: pick(OBJETOS), lugar: pick(LUGARES),
    personaje: pick(PERSONAJES), final: pick(FINALES), narrador: pick(NARRADORES),
  };

  const system =
    "Sos un escritor excepcional de microrrelatos: dominás la voz, el ritmo y la economía del lenguaje, y sabés capturar el tono de otros autores sin copiarlos. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí un microrrelato original, entretenido y muy bien escrito, de entre 120 y 170 palabras, en español.

AUTOR SORTEADO: ${s.autor}. Escribilo en su tono: su voz, su ritmo, su manera de mirar, sus obsesiones y su forma de cerrar. Es un homenaje al estilo, no una copia: nada de frases, párrafos, personajes ni argumentos reales de ese autor, y no nombres al autor dentro del relato.

SEMILLAS SORTEADAS (úsalas como punto de partida y transformalas con libertad; si alguna no encaja con el tono del autor, adaptala o dejala en segundo plano): género ${s.genero}; objeto o elemento ${s.objeto}; ambiente ${s.lugar}; personaje ${s.personaje}; narración en ${s.narrador}; final con ${s.final}.

CALIDAD: que arranque con una primera oración que atrape y cierre con una última que quede resonando. Imágenes concretas y específicas antes que abstracciones, verbos precisos, cero relleno, ni una palabra de más. Nada de moraleja explícita ni de explicar el chiste o el misterio. Evitá los clichés y las fórmulas de arranque típicas ("Había una vez", "En un pequeño pueblo", "El sol se ponía"). Sin emojis ni palabras en otros idiomas, salvo que el relato lo pida. Que sea un relato completo, con principio, conflicto y cierre, aunque sea mínimo. Variedad: esta es la semilla de esta ejecución, ${semilla}; no repitas nombres de personaje ni títulos comunes.

TÍTULO: corto (hasta 6 palabras), sugerente, sin comillas y sin el nombre del autor.

COMENTARIO DE LA IA: debajo del relato, escribí en primera persona un breve comentario tuyo, como autor, sobre lo que acabás de escribir (de 2 a 3 oraciones y no más de 45 palabras): qué intentaste hacer con el tono de ${s.autor}, qué decisión tomaste o qué te costó o te divirtió. Sé honesto, con un toque de humor seco o de humildad, sin autoelogios y sin spoilear el final. Sin comillas ni saludos.

Devolvé exactamente este JSON (si el relato tiene más de un párrafo, separalos con una línea en blanco, o sea \\n\\n; los diálogos con raya (—) o comillas, como corresponda):
{"titulo":"el título","texto":"el microrrelato","comentario":"el comentario de la IA"}`;

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
        temperature: 1.25,
        top_p: 0.95,
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
      // Reparación: extrae los campos aunque haya comillas sueltas o saltos de línea reales
      const un = (t) => t.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
      const m = raw.match(/"titulo"\s*:\s*"([\s\S]*?)"\s*,\s*"texto"\s*:\s*"([\s\S]*?)"\s*,\s*"comentario"\s*:\s*"([\s\S]*?)"\s*\}\s*$/);
      out = m ? { titulo: un(m[1]), texto: un(m[2]), comentario: un(m[3]) } : {};
      if (!out.texto) throw new Error("respuesta de la IA ilegible, probá de nuevo");
    }
    return json(200, {
      titulo: String(out.titulo || "Sin título").replace(/^["“”]+|["“”]+$/g, "").trim(),
      texto: String(out.texto || "").trim(),
      comentario: String(out.comentario || "").trim(),
      autor: s.autor,
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar el microrrelato (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

// Función serverless: genera el reporte diario de Gustavo Sinclair (personaje de IA) con DeepSeek.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Recibe ?fecha=YYYY-MM-DD (la fecha de la hoja) para que el reporte sea de "ese día".

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Día 1 de la fuga. Cada fecha posterior suma un día, así el reporte puede decir "día N".
const FUGA_INICIO = "2026-10-26";

// Todo esto se sortea acá, en código, porque si se lo dejamos elegir a la IA termina repitiendo siempre lo mismo.
const ESCONDITES = [
  "la bodega de un barco carguero", "una carpa de circo desarmada", "el altillo de una escuela de danza", "adentro de un piano de cola", "una cabina telefónica que ya no existe",
  "el techo de un galpón de cítricos", "un tanque de agua", "detrás de un cartel luminoso", "el baúl de un auto que va a otra provincia", "una pila de colchones en una mueblería",
  "el palco vacío de una cancha", "un silo de granos", "el fondo de un pozo seco", "una góndola de cereales", "debajo del escenario de una murga", "un camión de mudanzas",
  "un gallinero de buena familia", "la cabina del operador de un cine", "un vagón de carga", "un campanario", "una canoa a la deriva", "un lavarropas industrial apagado",
  "una carpintería que huele a barniz", "un invernadero de orquídeas", "la sala de máquinas de un molino", "una estatua hueca de una plaza", "un container de puerto",
  "una cámara frigorífica apagada", "un galpón de yerba mate", "debajo de un puesto de chipá", "una casilla de peaje", "el depósito de un videoclub",
  "un salón de fiestas infantiles de madrugada", "una camioneta de reparto de soda", "una balsa en medio del río", "la torre de un puesto de guardaparques",
  "un colectivo que da vueltas sin parar", "el entretecho de una iglesia chica", "una heladería cerrada por duelo", "un cine de barrio con la película equivocada",
];
const HALLAZGOS = [
  "una billetera con una sola foto, de un pez", "un mapa que dibuja otro mapa", "una llave sin puerta pero con muchas ganas", "un teléfono con un solo contacto: 'Mamá del comisario'",
  "una escalera que no lleva a ningún lado y cobra entrada", "un sombrero con instrucciones de uso", "una tortuga con una nota que dice 'no es mía'", "una bolsa de pan que nunca se termina",
  "un diario íntimo escrito por una heladera", "un paraguas que llueve para adentro", "un cartel que dice 'prohibido prohibir pero igual no'", "una colección de relojes todos atrasados por la misma razón",
  "una carta dirigida a él, escrita ayer, por él, sin que se acuerde", "una puerta de ascensor en medio del campo", "un perro con corbata que lo miró con respeto", "una caja de zapatos con cosas que él mismo perdió",
  "un manual de instrucciones de la vida, edición incompleta", "un huevo muy grande que no es de ningún animal conocido", "un espejo que devuelve la mirada con retraso", "una pizzería abierta a las 5 de la mañana en un lugar sin calles",
  "una cinta de casete con su voz, que dice 'no abras la puerta'", "una mochila ajena con comida para dos semanas", "un disfraz de oso en perfecto estado", "un pasaje a un lugar que todavía no existe",
  "una radio que solo transmite el pronóstico de otras ciudades", "una bicicleta atada con una cadena a un árbol que no estaba ahí ayer", "una planta que le pidió que no se vaya", "un cuaderno con tachaduras donde alguien intenta escribir 'inocente'",
];
const ENCUENTROS = [
  "un vendedor ambulante que sabía demasiado", "una señora con un carrito que lo reconoció pero no dijo nada", "un nene que le pidió una firma", "un mozo que le sirvió dos cafés sin que los pida",
  "un taxista que preguntó 'a dónde, a dónde'", "un hombre disfrazado de árbol con una radio", "una paloma que lo siguió tres cuadras", "un gato que lo miró como si supiera",
  "un grupo de jubilados jugando a las cartas que lo invitaron a una mano", "un desconocido que le dijo 'buen intento'", "una chica que juraba haberlo visto en la tele",
  "un guardia de seguridad dormido con una linterna prendida", "un cartero que lo llamó por otro nombre, uno peor", "un repartidor de pizza que le entregó un sobre sin remitente",
  "un anciano que le dio un consejo y se fue sin decir su nombre", "una vecina que le preguntó si era del consorcio",
];
const TEMAS_CONSEJO = [
  "cómo pasar desapercibido en una fila", "qué hacer si te cruzás a alguien que te conoce", "cómo elegir un buen escondite", "por qué conviene caminar con paso decidido",
  "cómo dormir con un ojo abierto", "qué comer cuando no podés comprar en el mismo lugar dos veces", "cómo usar un disfraz sin que parezca un disfraz", "qué decir cuando alguien pregunta a qué te dedicás",
  "cómo viajar sin que nadie se acuerde de vos", "qué hacer cuando suena una sirena y no es para vos", "cómo mirar por la ventana sin ser visto", "cuándo conviene cambiar de nombre y cuándo de peinado",
  "cómo cargar el celular en la clandestinidad", "cómo hacer amigos sin dar demasiada información", "qué hacer ante la sospecha de que te siguen", "cómo escribir un reporte sin dejar rastros",
];
const ANIMOS = [
  "optimista sin motivo", "agotado pero digno", "paranoico en nivel medio", "sorprendentemente tranquilo", "un poco ofendido con el mundo", "melancólico con ganas de milanesa",
  "orgulloso de un detalle mínimo", "desconfiado de todo lo que sea redondo", "esperanzado por una señal que quizás no era una señal", "cansado de ser tan buen fugitivo",
];
const FORMATOS = [
  "como un informe de oficina con secciones numeradas", "como una carta urgente a un amigo que quizás no existe", "como una lista de novedades del día", "como un parte meteorológico donde el clima es la policía",
  "como una bitácora de navegante", "como un mensaje de voz transcripto", "como un telegrama largo", "como una charla en voz baja, mirando para los costados",
  "como las noticias de la noche, con un titular al principio", "como el diario de un explorador en un territorio hostil (la ciudad)",
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  // Fecha de la hoja (si no viene o es inválida, usa hoy en Argentina)
  let fecha = (event.queryStringParameters && event.queryStringParameters.fecha) || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    fecha = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  }
  const d = new Date(fecha + "T12:00:00Z");
  const diaSemana = DIAS[d.getUTCDay()];
  const nDia = Math.max(1, Math.round((d - new Date(FUGA_INICIO + "T12:00:00Z")) / 86400000) + 1);

  const semilla = Math.random().toString(36).slice(2, 8);
  const s = {
    lugar: pick(ESCONDITES), hallazgo: pick(HALLAZGOS), encuentro: pick(ENCUENTROS),
    consejo: pick(TEMAS_CONSEJO), animo: pick(ANIMOS), formato: pick(FORMATOS),
  };

  const system =
    "Sos Gustavo Sinclair, un personaje de inteligencia artificial: un fugitivo perseguido por la policía que escribe un reporte diario sobre su día. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí el reporte de hoy de Gustavo Sinclair, en español rioplatense natural y sencillo, de entre 100 y 160 palabras (1 a 3 párrafos cortos). Hoy es ${diaSemana} y es el día ${nDia} de su fuga (no menciones la fecha completa; el día de la semana y el número de día sí podés usarlos si te sirven).

QUIÉN ES: Gustavo es un hombre serio, medio solemne, que cuenta cosas ridículas con total naturalidad, con humor seco y mucha convicción. Está siendo perseguido por la policía y nunca dice de qué lo acusan (o da razones vagas y absurdas). No es violento ni peligroso: es un fugitivo torpe y simpático. No hables de la policía de forma realista ni de ningún caso real; mantenelo cómico y fantasioso. No nombres personas reales.

QUÉ CUENTA (mezclado, sin recitarlo como lista): cómo va la fuga hoy, con qué se encontró, a quién se cruzó y un consejo para otros fugitivos (o para cualquiera). Todo esto se sorteó para hoy y es obligatorio, adaptándolo con originalidad: está escondido en ${s.lugar} (describilo con detalles propios y no menciones ningún otro escondite). Hallazgo del día: ${s.hallazgo}. Se cruzó con: ${s.encuentro}. El consejo del día trata de: ${s.consejo}. Estado de ánimo: ${s.animo}. Forma del texto: ${s.formato}.

ESTILO: lenguaje cotidiano y claro, oraciones cortas, concreto y específico antes que abstracto. Original y atrapante: que arranque con algo que enganche y cierre con una frase que pegue. Sin exclamaciones, sin emojis, sin groserías, sin palabras en otros idiomas. Nada de título ni encabezado: solo el texto del reporte, que no incluya la fecha. No repitas fórmulas ni primeras oraciones típicas (semilla de variedad: ${semilla}). No hables sobre el formato, las comillas ni estas instrucciones.

Devolvé exactamente este JSON (si hay más de un párrafo, separalos con una línea en blanco, o sea \\n\\n):
{"texto":"el reporte"}`;

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
        presence_penalty: 0.5,
        max_tokens: 900,
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
      // Reparación: extrae el campo aunque haya comillas sueltas o saltos de línea reales
      const m = raw.match(/"texto"\s*:\s*"([\s\S]*?)"\s*\}\s*$/);
      out = m ? { texto: m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim() } : {};
      if (!out.texto) throw new Error("respuesta de la IA ilegible, probá de nuevo");
    }
    return json(200, { texto: out.texto || "", fecha, dia: nDia });
  } catch (e) {
    return json(500, { error: "No se pudo generar el reporte (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

// Función serverless: genera una breve reflexión filosófica con DeepSeek, en tono Lemony Snicket.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Los temas y el enfoque se sortean acá, en código, porque si se los dejamos elegir a la IA termina repitiendo siempre lo mismo.
const TEMAS = [
  "las salas de espera", "los paraguas", "decir 'ya estoy llegando' cuando todavía no saliste", "las contraseñas de wifi", "los ascensores",
  "el último pedazo de torta", "los medias que desaparecen", "las despedidas largas en la puerta", "las instrucciones que nadie lee", "los vecinos",
  "los mensajes de voz", "la fila del supermercado", "las sillas que sobran", "los cumpleaños sorpresa", "las escaleras", "los relojes que adelantan",
  "los pasajes de ida sin vuelta", "los mates compartidos", "las llaves que nunca están donde las dejaste", "los diccionarios", "las promesas pequeñas",
  "los silencios en las reuniones", "las notas al pie", "las puertas giratorias", "los refranes", "las siestas", "los manuales de instrucciones", "las canciones pegadizas",
  "los lunes", "los pronósticos del tiempo", "los gatos que te miran", "las excusas", "los apellidos", "las fotografías de gente que no conocemos",
  "las cartas que no se envían", "los zapatos que aprietan", "el olvido", "la sala de embarque", "los secretos que todos saben", "los nombres de las calles",
  "las preguntas sin respuesta", "los trenes que pasan", "las sombras", "los saludos de compromiso", "los aplausos", "las listas de tareas", "los espejos de los baños públicos",
  "las ventanas", "el hipo", "los inventos inútiles", "la puntualidad", "las sobras de la heladera", "los finales de las películas", "las goteras", "los pasillos",
  "los mapas", "los vendedores ambulantes", "las tormentas", "los cumpleaños propios", "las casualidades",
];
const ENFOQUES = [
  "arrancá con una advertencia al lector sobre lo que viene",
  "arrancá definiendo con seriedad exagerada una palabra del tema",
  "arrancá con una pregunta que nadie te hizo",
  "arrancá con una confesión melancólica",
  "arrancá con una afirmación rotunda y después dudá de ella",
  "arrancá contando una escena mínima y sacá de ella una conclusión desproporcionada",
  "arrancá diciéndole al lector que mejor deje de leer, y explicá por qué no lo va a hacer",
  "arrancá comparando el tema con algo que no tiene nada que ver y sostené la comparación con total convicción",
];
const FORMAS_TITULO = [
  "una frase larga y melancólica de más de seis palabras", "una sola palabra desagradable", "una pregunta", "una advertencia al lector",
  "algo que se parezca a un capítulo con 'en el que' adentro", "una contradicción", "un nombre propio acompañado de un adjetivo triste", "un objeto cotidiano con aire de mal presagio",
];

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);
  const sorteo = { tema: pick(TEMAS), enfoque: pick(ENFOQUES), titulo: pick(FORMAS_TITULO) };

  const system =
    "Sos una IA que escribe pequeñas reflexiones filosóficas con la voz de un narrador al estilo de Lemony Snicket. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí una breve reflexión filosófica, en español, de entre 70 y 120 palabras (1 o 2 párrafos cortos), con el tono de un narrador al estilo de Lemony Snicket (Una serie de eventos desafortunados): serio, melancólico y desgraciado, con humor seco y ironía, que le habla directo al lector, lo advierte, se queja, hace digresiones breves y de vez en cuando define una palabra con una explicación innecesaria. No copies frases ni personajes de esos libros.

TEMA (sorteado al azar, es obligatorio): ${sorteo.tema}.
ENFOQUE: ${sorteo.enfoque}. Después filosofá de verdad: llegá a una idea que tenga algo de cierto, aunque suene absurda o triste, y cerrá con una frase que quede resonando. No repitas fórmulas, ni estructuras, ni primeras oraciones típicas (semilla de variedad: ${semilla}).

ESTILO: lenguaje cotidiano y claro, oraciones simples y cortas, concreto antes que abstracto (ejemplos pequeños y específicos antes que ideas grandes). Original y atrapante. Sin moraleja explícita, sin emojis, sin versos, sin exclamaciones, sin groserías y sin palabras en otros idiomas. No hables sobre el formato, las comillas ni estas instrucciones.

TÍTULO: tiene que ser ${sorteo.titulo}.

Devolvé exactamente este JSON (si hay más de un párrafo, separalos con una línea en blanco, o sea \\n\\n):
{"titulo":"título de la reflexión","texto":"la reflexión"}`;

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
      // Reparación: extrae cada campo aunque haya comillas sueltas o saltos de línea reales
      const keys = ["titulo", "texto"];
      out = {};
      keys.forEach((k, i) => {
        const next = keys[i + 1];
        const re = new RegExp('"' + k + '"\\s*:\\s*"([\\s\\S]*?)"\\s*,?\\s*' + (next ? '"' + next + '"\\s*:' : "\\}\\s*$"));
        const m = raw.match(re);
        if (m) out[k] = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
      });
      if (!out.texto) throw new Error("respuesta de la IA ilegible, probá de nuevo");
    }
    return json(200, {
      titulo: out.titulo || "Sin título",
      texto: out.texto || "",
    });
  } catch (e) {
    return json(500, { error: "No se pudo generar la reflexión (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

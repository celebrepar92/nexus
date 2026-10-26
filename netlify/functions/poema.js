// Función serverless: genera un debate filosófico breve con DeepSeek (solo diálogo, sin formato de obra).
// Los personajes son los propios filósofos: ARISTÓTELES, HEGEL y MARX, que discuten y se retroalimentan entre sí.
// El tema (con la tensión clásica entre los tres), quién abre y cómo cierra se sortean acá, en código, para que cada debate sea distinto.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { dialogo:[{personaje,texto}], tema }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Cada tema trae la tensión real entre las tres posturas, para que el debate tenga contenido y no se quede en generalidades.
const TEMAS = [
  { tema: "el trabajo", tension: "Aristóteles ve el trabajo manual como algo necesario pero menor, y cree que el fin es el ocio dedicado a la virtud y al pensamiento; Hegel dice que al trabajar y transformar las cosas la persona se forma y se reconoce a sí misma (el esclavo que, trabajando, se vuelve más consciente que el amo); Marx sostiene que el trabajo es lo propio del ser humano, pero que bajo el capitalismo se vuelve ajeno y alienado" },
  { tema: "la libertad", tension: "Aristóteles la ve como vivir bien en la ciudad, actuando según la virtud; Hegel como autodeterminación que se realiza en instituciones racionales a lo largo de la historia; Marx como algo que exige condiciones materiales reales y el fin de la explotación" },
  { tema: "el Estado", tension: "Aristóteles dice que la ciudad es natural y que existe para la vida buena; Hegel ve al Estado como la realización de la vida ética de un pueblo; Marx lo ve como el instrumento de la clase dominante" },
  { tema: "la felicidad", tension: "Aristóteles habla de eudaimonía, una vida plena según la virtud, que necesita ciertos bienes y amigos; Hegel de reconciliarse con el mundo racional; Marx de que no hay felicidad plena mientras haya alienación y desigualdad" },
  { tema: "la historia", tension: "Hegel ve la historia como el avance de la conciencia de la libertad; Marx la ve como lucha de clases determinada por las condiciones materiales; Aristóteles, que mira más los regímenes y sus cambios que un progreso general, pregunta qué garantiza que haya avance" },
  { tema: "el dinero y el valor", tension: "Aristóteles distingue entre la economía doméstica (obtener lo necesario) y la crematística (acumular por acumular), y analiza el intercambio; Marx analiza el valor y el capital como dinero que busca más dinero; Hegel ve en la sociedad civil un sistema de necesidades que a la vez libera y desgarra" },
  { tema: "la propiedad", tension: "Aristóteles defiende la propiedad privada frente al comunismo de Platón, pero con uso compartido; Hegel la ve como la forma en que la libertad de la persona toma cuerpo en las cosas; Marx la ve como origen de la desigualdad y propone superarla" },
  { tema: "el amo, el esclavo y el reconocimiento", tension: "Aristóteles defendió la esclavitud 'natural' en su época y los otros dos lo cuestionan duramente; Hegel muestra que el amo depende del esclavo para ser reconocido; Marx traslada esa lógica a la relación entre capital y trabajo asalariado" },
  { tema: "la técnica y las máquinas", tension: "Aristóteles imaginó que si las lanzaderas tejieran solas no harían falta esclavos; Marx estudia cómo las máquinas, en manos del capital, subordinan al trabajador en vez de liberarlo; Hegel ve en la herramienta una forma de astucia de la razón que pone a la naturaleza a trabajar por nosotros" },
  { tema: "la razón", tension: "Aristóteles ve la razón como lo propio del ser humano y como una forma de ordenar lo que observa; Hegel sostiene que lo racional es real y que la razón se despliega en la historia; Marx cree que las ideas se explican por las condiciones materiales en las que nacen" },
  { tema: "la contradicción", tension: "Aristóteles sostiene que algo no puede ser y no ser a la vez y en el mismo sentido; Hegel dice que la contradicción es el motor del pensamiento y de la realidad; Marx toma de él esa idea y la lleva a las contradicciones materiales de la sociedad" },
  { tema: "la justicia", tension: "Aristóteles distingue la justicia distributiva (dar a cada uno lo que corresponde) de la correctiva; Hegel la ve como parte de un orden de derecho y vida ética; Marx la mide por quién produce la riqueza y quién se la queda" },
  { tema: "la educación", tension: "Aristóteles cree que la virtud se forma con el hábito y la educación desde la niñez; Hegel habla de formación (Bildung) como salir de uno mismo y entrar en lo universal; Marx critica una educación que reproduce las desigualdades y propone unir estudio y trabajo" },
  { tema: "la amistad y la comunidad", tension: "Aristóteles dedica páginas a la amistad como parte de la vida buena; Hegel la ubica dentro de la vida ética (familia, sociedad civil, Estado); Marx piensa en una comunidad real, no abstracta, donde la persona no sea un medio para otra" },
  { tema: "el arte", tension: "Aristóteles estudia la tragedia y su efecto sobre quien la ve; Hegel ve el arte como la manera sensible de mostrar la idea y discute si su época ya la superó; Marx se pregunta cómo el arte nace de las condiciones sociales y por qué el arte griego todavía nos conmueve" },
  { tema: "la naturaleza humana", tension: "Aristóteles dice que el ser humano es un animal racional y político con una naturaleza que busca realizarse; Hegel dice que el ser humano se hace a sí mismo en la historia; Marx dice que la esencia humana es el conjunto de las relaciones sociales" },
  { tema: "el ocio y el tiempo libre", tension: "Aristóteles cree que el ocio es el fin del trabajo y que permite pensar y cultivar la virtud; Marx sostiene que reducir la jornada laboral abre un reino de libertad, pero que hoy el tiempo libre también está capturado; Hegel se pregunta si el tiempo libre sin formación es libertad" },
  { tema: "la democracia", tension: "Aristóteles prefiere un régimen mixto con clase media fuerte y teme a la democracia sin ley; Hegel desconfía del voto individual y defiende instituciones que representen los intereses organizados; Marx dice que la democracia formal no alcanza si el poder económico está concentrado" },
  { tema: "el bien y la ética", tension: "Aristóteles dice que el bien se aprende con la práctica de la virtud y el término medio; Hegel habla de eticidad, es decir, normas vividas en instituciones concretas; Marx sospecha que la moral dominante expresa los intereses de la clase dominante" },
  { tema: "el cambio y el movimiento", tension: "Aristóteles explica el cambio como paso de la potencia al acto; Hegel como un devenir que avanza por contradicciones; Marx como transformación práctica del mundo, no solo interpretación" },
  { tema: "la familia", tension: "Aristóteles ve la casa como la base de la ciudad; Hegel como el primer momento de la vida ética, basado en el amor; Marx cuestiona cómo la propiedad y el capital moldean la familia" },
  { tema: "la religión", tension: "Aristóteles piensa un primer motor que mueve sin ser movido; Hegel ve la religión como una forma de captar en imágenes lo que la filosofía piensa en conceptos; Marx dice que la religión expresa una miseria real y a la vez consuela de ella" },
  { tema: "el futuro de la sociedad", tension: "Aristóteles pregunta qué ciudad permitiría vivir bien; Hegel cree que la libertad ya tiene formas históricas reales que hay que comprender; Marx cree que el futuro depende de una transformación práctica de las condiciones materiales" },
];
const FINALES = [
  "uno concede un punto al otro y reconoce que su postura tenía un hueco",
  "quedan en desacuerdo, pero cada uno se lleva una idea del otro",
  "una pregunta abierta que los tres reconocen que no pueden resolver todavía",
  "una síntesis parcial entre dos de ellos, que el tercero cuestiona",
  "Marx tiene la última palabra, con una frase breve y filosa",
  "Aristóteles cierra con una pregunta simple que reabre todo",
  "Hegel cierra mostrando cómo lo discutido es parte de un mismo movimiento",
];
const ORDEN = ["ARISTÓTELES", "HEGEL", "MARX"];

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
  const s = { t: pick(TEMAS), final: pick(FINALES), abre: pick(ORDEN) };

  const system =
    "Sos un divulgador de filosofía excepcional: sabés llevar ideas de alto nivel a un lenguaje simple sin traicionarlas, y escribís diálogos con tensión real, donde cada personaje responde a lo que dijo el otro. Conocés a fondo a Aristóteles, a Hegel y a Marx. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const user_prompt = `Escribí un debate filosófico breve entre Aristóteles, Hegel y Marx, en español, de entre 240 y 300 palabras en total. Es solamente una conversación: sin escena, sin acotaciones, sin descripciones de acciones, sin narrador, sin corchetes ni paréntesis, sin asteriscos. Solo lo que dicen, nada más.

PERSONAJES (los tres, siempre; no agregues otros). Es un encuentro imaginario, fuera del tiempo: los tres conocen las ideas de los demás y pueden responderse (Aristóteles puede contestar a Hegel y a Marx, y ellos a él). No digas que es imaginario ni hables de la época de cada uno. Cada uno habla desde sus ideas reales:
- ARISTÓTELES: observador y metódico. Parte de ejemplos concretos y de la experiencia, pregunta para qué sirve cada cosa y cuál es su fin, defiende el equilibrio y el término medio, desconfía de las teorías demasiado abstractas. Sereno y claro.
- HEGEL: ve todo en movimiento, en contradicciones que se superan y en procesos históricos. Ama los sistemas y las conexiones. Tiene fama de oscuro, pero acá explica con paciencia y con imágenes simples. Seguro de sí mismo, un poco solemne.
- MARX: directo, irónico y punzante. Baja todo a la vida material: quién produce, quién se queda con qué, qué condiciones lo hacen posible. Admira a Hegel pero cree que lo puso "cabeza abajo", y respeta a Aristóteles aunque le discute sus límites.

TEMA SORTEADO: ${s.t.tema}. Posturas de fondo (usalas como base, con precisión; no las recites todas ni como lista): ${s.t.tension}.

CÓMO DEBE SER EL DEBATE: lenguaje simple pero de alto nivel. Palabras de todos los días y frases cortas, como si se lo explicaran a una persona inteligente que nunca estudió filosofía; si aparece un concepto técnico (dialéctica, alienación, potencia y acto, eticidad…), se explica en la misma conversación con una imagen o un ejemplo concreto, sin glosario aparte. Que haya argumentos de verdad: objeciones, contraejemplos, concesiones. Cada intervención responde directamente a lo que dijo el anterior y lo retoma, lo corrige o lo lleva más lejos (que se retroalimenten; nada de tres monólogos paralelos). En algún momento dos de ellos coinciden contra el tercero y luego se reordena la discusión. Cada uno se mantiene fiel a su pensamiento real, pero puede cambiar un matiz al escuchar al otro. Ejemplos concretos y cotidianos (un zapatero, un telar, una fábrica, una casa, una ciudad, un salario). Tono serio, con algún toque de humor seco o ironía sutil, sin disparates ni chistes absurdos. Se tratan con respeto, aunque discutan fuerte.

RIGOR: no atribuyas a nadie una idea que no sostuvo. No inventes citas textuales. Podés usar una frase famosa solo si estás completamente seguro de que es real y de quién es; si no, parafraseá la idea. Si el tema toca algo en lo que Aristóteles dijo algo hoy inaceptable, que lo diga como lo sostuvo y que los otros lo cuestionen con firmeza, sin justificarlo.

ARRANQUE Y FINAL: Empieza hablando ${s.abre}, con algo que atrape y plantee el asunto con una pregunta o una afirmación fuerte. Cierre: ${s.final}. Que la última línea quede resonando. Sin moraleja explícita. Sin emojis ni palabras en otros idiomas. Variedad: semilla de esta ejecución, ${semilla}.

FORMATO: "dialogo" es una lista de entre 12 y 16 intervenciones, cada una con "personaje" (exactamente ARISTÓTELES, HEGEL o MARX) y "texto" (lo que dice, de una a tres oraciones, nada más). Los tres tienen que hablar. No agregues título, explicaciones, comentarios ni notas.

Devolvé exactamente este JSON:
{"dialogo":[{"personaje":"${s.abre}","texto":"..."}]}`;

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
        temperature: 0.9,
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

    // Solo los tres filósofos, y solo lo que dicen
    const dialogo = (Array.isArray(out.dialogo) ? out.dialogo : [])
      .map((d) => {
        const n = norm(d && (d.personaje || d.actor));
        const personaje = n.includes("ARISTOT") ? "ARISTÓTELES" : n.includes("HEGEL") ? "HEGEL" : n.includes("MARX") ? "MARX" : "";
        return { personaje, texto: limpiar(d && d.texto) };
      })
      .filter((d) => d.personaje && d.texto);
    if (dialogo.length < 5) throw new Error("el debate salió incompleto, probá de nuevo");

    return json(200, { dialogo, tema: s.t.tema });
  } catch (e) {
    return json(500, { error: "No se pudo generar el debate (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

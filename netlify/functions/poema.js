// Función serverless: genera un debate filosófico breve con DeepSeek (solo diálogo, sin formato de obra).
// En cada ejecución se sortean TRES filósofos distintos de una lista amplia (cada uno con su sistema y su voz),
// un tema, un orden de turnos al azar (no siempre 1-2-3: hay interrupciones y duelos) y la forma de cerrar.
// La API key vive SOLO en la variable de entorno DEEPSEEK_API_KEY (Netlify > Site settings > Environment variables).
// Solo responde a usuarios logueados con Netlify Identity.
// Devuelve: { dialogo:[{personaje,texto}], tema, filosofos:[nombre,...] }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------------------
// FILÓSOFOS: id = cómo aparece su nombre en el diálogo (en mayúsculas), nombre = cómo se lo nombra en el texto,
// sistema = sus ideas reales (base para que no se les atribuya nada falso), voz = cómo habla.
// ---------------------------------------------------------------------------
const FILOSOFOS = [
  { id: "SÓCRATES", nombre: "Sócrates", sistema: "No escribió nada: lo conocemos sobre todo por Platón. Su método es preguntar hasta mostrar que nadie sabe tan bien como cree lo que dice saber; reconoce su propia ignorancia. Sostiene que la virtud es una forma de conocimiento, que nadie hace el mal a sabiendas y que una vida sin examen no vale la pena vivirla", voz: "irónico, se hace el ingenuo, responde con preguntas cortas que desarman al otro" },
  { id: "PLATÓN", nombre: "Platón", sistema: "Distingue el mundo sensible, que cambia, de las Ideas o Formas, que son lo verdaderamente real (la caverna es su imagen). El alma tiene partes (razón, ánimo, deseo) y la justicia es que cada parte, en el alma y en la ciudad, cumpla su función. Piensa que deberían gobernar quienes conocen el Bien, los filósofos", voz: "solemne, recurre a mitos e imágenes, busca lo que hay detrás de las apariencias" },
  { id: "ARISTÓTELES", nombre: "Aristóteles", sistema: "Observador y metódico: parte de la experiencia, pregunta por la causa y el fin de cada cosa. El ser humano es un animal racional y político; la felicidad (eudaimonía) es una vida plena según la virtud, que se encuentra en el término medio y se forma con el hábito. Piensa el cambio como paso de la potencia al acto. Critica las Ideas separadas de Platón", voz: "sereno y claro, parte de ejemplos concretos, desconfía de las teorías demasiado abstractas" },
  { id: "EPICURO", nombre: "Epicuro", sistema: "El placer es el bien, entendido sobre todo como ausencia de dolor y de perturbación del alma (ataraxia). Hay que distinguir deseos naturales y necesarios de los vanos. La amistad vale mucho, y no hay que temer ni a los dioses ni a la muerte, porque cuando la muerte llega, uno ya no está. Explica el mundo con átomos", voz: "cálido, práctico, tranquilo, receta vivir con poco y bien acompañado" },
  { id: "EPICTETO", nombre: "Epicteto", sistema: "Estoico, antiguo esclavo. Hay cosas que dependen de nosotros (juicios, deseos, acciones) y cosas que no (cuerpo, fortuna, reputación). Lo que nos perturba no son las cosas sino lo que pensamos de ellas. La libertad interior es posible en cualquier condición, y hay que aceptar el orden del mundo", voz: "seco, directo, severo con las excusas, pedagógico" },
  { id: "PIRRÓN", nombre: "Pirrón", sistema: "Fundador del escepticismo: a cada argumento se le puede oponer otro igual de fuerte, así que lo sensato es suspender el juicio (epoché), y de esa suspensión sigue la serenidad (ataraxia). Desconfía de quien afirma conocer la verdad de las cosas", voz: "tranquilo, amable, nunca afirma del todo, devuelve la duda" },
  { id: "HERÁCLITO", nombre: "Heráclito", sistema: "Todo fluye y cambia (el río en el que no se entra dos veces). La realidad es una lucha y tensión de opuestos que forman una armonía, ordenada por el logos. Los más no entienden lo que tienen delante", voz: "breve, enigmático, a veces desafiante; usa imágenes como el río, el fuego, el arco" },
  { id: "AGUSTÍN", nombre: "San Agustín", sistema: "El corazón está inquieto hasta que descansa en Dios. El mal no es una cosa sino ausencia de bien; tenemos libre albedrío pero necesitamos la gracia. El tiempo se vive en el alma (memoria, atención, espera). Hay dos ciudades, la del amor a Dios y la del amor a sí mismo", voz: "apasionado, confesional, habla de su propia experiencia interior" },
  { id: "TOMÁS DE AQUINO", nombre: "Tomás de Aquino", sistema: "Armoniza fe y razón, y retoma a Aristóteles. Defiende una ley natural accesible a la razón, las virtudes como camino a la felicidad que culmina en Dios, y la política orientada al bien común. Argumenta con orden: objeciones, respuesta, réplicas", voz: "ordenado, distingue conceptos, concede lo que corresponde antes de responder" },
  { id: "AVERROES", nombre: "Averroes", sistema: "Gran comentarista de Aristóteles. Sostiene que filosofía y religión no se contradicen, porque la verdad no puede oponerse a la verdad, y que la razón demostrativa es para quienes pueden seguirla, mientras que el pueblo se guía por imágenes y parábolas. Defiende que las mujeres podrían participar en la vida pública y en la filosofía", voz: "culto, conciliador, firme en defender la razón" },
  { id: "MAQUIAVELO", nombre: "Maquiavelo", sistema: "Mira la política tal como es y no como debería ser. Entiende la acción política como juego entre virtù (capacidad, energía) y fortuna (azar). Un gobernante que quiere mantener su Estado a veces no puede ser bueno en el sentido corriente. Valora las repúblicas y la tensión entre el pueblo y los poderosos como fuente de libertad", voz: "cínico, práctico, ejemplos históricos, desconfía de las buenas intenciones" },
  { id: "HOBBES", nombre: "Hobbes", sistema: "Sin un poder común, los hombres viven en guerra de todos contra todos, con miedo a la muerte violenta. Por eso pactan y ceden su poder a un soberano fuerte (el Leviatán) a cambio de seguridad. La paz vale más que casi cualquier otra cosa", voz: "pesimista, lógico, tajante, no se hace ilusiones sobre la gente" },
  { id: "DESCARTES", nombre: "Descartes", sistema: "Busca una certeza firme con la duda metódica: duda de todo hasta encontrar algo indudable, que pienso y por tanto existo. Distingue mente y cuerpo como dos sustancias. Solo acepta lo que se presenta con claridad y distinción, y desconfía de los sentidos", voz: "metódico, ordenado, parte desde cero y avanza paso a paso" },
  { id: "SPINOZA", nombre: "Spinoza", sistema: "Hay una sola sustancia, Dios o la Naturaleza, y todo ocurre por necesidad, sin fines ocultos. Los afectos (alegría, tristeza, deseo) se estudian como cosas naturales. Cada cosa se esfuerza por perseverar en su ser. La libertad es comprender las causas que nos determinan, no escapar de ellas", voz: "sereno, claro, casi geométrico, sin dramatismo" },
  { id: "LOCKE", nombre: "Locke", sistema: "La mente nace como una hoja en blanco y el conocimiento viene de la experiencia. Tenemos derechos naturales a la vida, la libertad y la propiedad. El gobierno se funda en el consentimiento y debe poder cambiarse si abusa. Defiende la tolerancia religiosa", voz: "sensato, moderado, apela al sentido común y a la experiencia" },
  { id: "LEIBNIZ", nombre: "Leibniz", sistema: "La realidad se compone de mónadas, unidades simples que reflejan el universo. Nada ocurre sin una razón suficiente. Este es el mejor de los mundos posibles. Soñó con un lenguaje universal para calcular y resolver disputas", voz: "optimista, conciliador, busca puntos de acuerdo, mentalidad matemática" },
  { id: "HUME", nombre: "Hume", sistema: "Empirista escéptico: todo conocimiento nace de impresiones; la causalidad es un hábito de la mente y no algo que veamos; el yo es un haz de percepciones. La razón es esclava de las pasiones, la moral se funda en sentimientos y no se puede pasar de lo que es a lo que debe ser sin más", voz: "amable, irónico, muy atento a lo que realmente podemos observar" },
  { id: "ROUSSEAU", nombre: "Rousseau", sistema: "El ser humano es bueno por naturaleza y la sociedad desigual lo corrompe; la propiedad es origen de desigualdad. Propone un contrato social donde la voluntad general garantice la libertad de todos. Defiende una educación natural", voz: "apasionado, sentimental, indignado con la desigualdad" },
  { id: "KANT", nombre: "Kant", sistema: "Conocemos solo cómo las cosas se nos aparecen, ordenadas por las formas de nuestra mente; la razón tiene límites. La moral no depende de las consecuencias sino del deber: el imperativo categórico (actuar según una norma que pudiera valer para todos). Cada persona es un fin en sí misma, nunca solo un medio. Ilustración es atreverse a pensar por uno mismo", voz: "riguroso, preciso, algo severo, distingue siempre con cuidado" },
  { id: "HEGEL", nombre: "Hegel", sistema: "Todo está en movimiento, en contradicciones que se superan en procesos históricos; la historia es el avance de la conciencia de la libertad. Lo racional es real. La libertad se realiza en instituciones (familia, sociedad civil, Estado) y el reconocimiento mutuo es clave (el amo y el esclavo). Tiene fama de oscuro, pero acá explica con paciencia", voz: "seguro de sí, un poco solemne, ve conexiones y procesos en todo" },
  { id: "SCHOPENHAUER", nombre: "Schopenhauer", sistema: "El mundo es voluntad, un impulso ciego y sin fin, y también representación. Desear es sufrir; la satisfacción dura poco y vuelve el aburrimiento. Alivian la contemplación del arte, la compasión y la renuncia al deseo", voz: "pesimista, mordaz, con humor negro" },
  { id: "KIERKEGAARD", nombre: "Kierkegaard", sistema: "Desconfía de los sistemas que lo explican todo: lo que importa es la existencia del individuo concreto. Describe tres estadios (estético, ético, religioso), la angustia como vértigo de la libertad y el salto de la fe. Critica a Hegel y a la multitud", voz: "irónico, íntimo, apasionado, habla de la vida de una persona real" },
  { id: "MARX", nombre: "Marx", sistema: "Baja todo a la vida material: quién produce, quién se queda con qué. El trabajo es lo propio del ser humano pero bajo el capitalismo se vuelve ajeno (alienación). La historia es lucha de clases; las ideas dominantes expresan a la clase dominante. Cree que hay que transformar el mundo y no solo interpretarlo. Admira a Hegel pero cree que lo puso cabeza abajo", voz: "directo, irónico, punzante, siempre pregunta a quién le sirve esto" },
  { id: "MILL", nombre: "John Stuart Mill", sistema: "Utilitarista: lo correcto es lo que aumenta la felicidad, y hay placeres de más calidad que otros. Defiende la libertad individual: el Estado solo puede limitar a alguien para evitar un daño a otros. Defiende la libertad de expresión y la igualdad de las mujeres", voz: "claro, razonable, ofrece distinciones útiles y ejemplos de la vida corriente" },
  { id: "NIETZSCHE", nombre: "Nietzsche", sistema: "Critica la moral de rebaño y el cristianismo como moral de débiles. Habla de la muerte de Dios, del nihilismo, de la voluntad de poder, del superhombre y del eterno retorno. No hay hechos sino interpretaciones (perspectivismo). Invita a crear los propios valores", voz: "provocador, vital, directo, con frases cortas y filosas" },
  { id: "WITTGENSTEIN", nombre: "Wittgenstein", sistema: "Los problemas filosóficos surgen de confundirnos con el lenguaje. En su segunda etapa, el significado de una palabra es su uso en juegos de lenguaje concretos. Al principio sostuvo que de lo que no se puede hablar hay que callar", voz: "breve, seco, pregunta cómo se usa realmente cada palabra" },
  { id: "SARTRE", nombre: "Sartre", sistema: "La existencia precede a la esencia: no hay naturaleza humana dada, cada uno se hace con sus elecciones. Estamos condenados a ser libres. Llama mala fe a escudarse en que no teníamos opción. La mirada del otro nos convierte en objeto. Hay que comprometerse", voz: "enérgico, directo, no acepta excusas" },
  { id: "BEAUVOIR", nombre: "Simone de Beauvoir", sistema: "Ética de la ambigüedad: somos libres pero situados. Dijo que no se nace mujer, se llega a serlo: la opresión de las mujeres es construida socialmente, y se las convierte en el Otro. La libertad propia exige la libertad de los demás", voz: "lúcida, concreta, con ejemplos de la vida cotidiana" },
  { id: "ARENDT", nombre: "Hannah Arendt", sistema: "Distingue labor (lo que sostiene la vida), trabajo (lo que fabrica un mundo duradero) y acción (hablar y actuar entre otros). La pluralidad y la natalidad (poder empezar algo nuevo) son claves. Analizó el totalitarismo y la banalidad del mal: el mal puede venir de no pensar. La política vive en el espacio público", voz: "clara, curiosa, aguda, desconfía de las etiquetas" },
  { id: "POPPER", nombre: "Popper", sistema: "Una teoría científica se reconoce porque puede ser refutada (falsacionismo); el conocimiento avanza por conjeturas y refutaciones. Defiende la sociedad abierta, donde se pueden corregir errores sin violencia, y critica el historicismo y las utopías totales (Platón, Hegel, Marx)", voz: "directo, crítico, pregunta qué podría demostrar que estás equivocado" },
  { id: "FOUCAULT", nombre: "Foucault", sistema: "El poder no está solo en el Estado: circula en instituciones (escuela, hospital, cárcel, fábrica) y produce saberes y formas de normalidad. Estudió la disciplina y la vigilancia. Lo que damos por natural (locura, sexualidad, castigo) tiene historia", voz: "analítico, desconfía de lo que parece obvio, pregunta quién dice qué es normal" },
  { id: "RAWLS", nombre: "Rawls", sistema: "La justicia como equidad: los principios justos son los que elegiríamos sin saber qué lugar ocuparemos en la sociedad (velo de ignorancia). Libertades básicas iguales, igualdad de oportunidades, y las desigualdades solo se justifican si benefician a los que menos tienen", voz: "calmo, ordenado, propone experimentos mentales" },
  { id: "CONFUCIO", nombre: "Confucio", sistema: "Una sociedad buena se sostiene en personas cultivadas: humanidad (ren), respeto por los ritos y deberes de cada rol (padre, hijo, gobernante, amigo). Se gobierna con el ejemplo moral antes que con castigos. La educación y la armonía son centrales", voz: "sereno, sencillo, concreto, habla de la vida en familia y en el pueblo" },
  { id: "LAO TSE", nombre: "Lao Tse", sistema: "El Tao es el camino que no se puede decir del todo. Hay que actuar sin forzar (wu wei), como el agua que vence a la piedra siendo blanda. Desconfía de las leyes excesivas, de la ambición y del saber artificial", voz: "paradójico, tranquilo, breve, usa imágenes de agua, valles, lo vacío" },
  { id: "BUDA", nombre: "Buda", sistema: "La vida está atravesada por el sufrimiento, que nace del apego y del deseo; se puede superar con un camino medio (ética, atención, sabiduría). No hay un yo fijo, todo es impermanente y depende de otras cosas. Insiste en comprobar las enseñanzas por la propia experiencia", voz: "compasivo, calmo, usa ejemplos simples y cotidianos" },
  { id: "ORTEGA", nombre: "Ortega y Gasset", sistema: "Yo soy yo y mi circunstancia. La vida es el hecho básico y la razón debe ser razón vital, nacida de la vida concreta. Cada punto de vista capta una parte de la verdad (perspectivismo). Advirtió sobre el hombre masa, que se cree con derecho a todo sin esfuerzo", voz: "elegante, ensayístico, con imágenes claras" },
  { id: "WEIL", nombre: "Simone Weil", sistema: "La atención es la forma más rara y pura de generosidad. La fuerza convierte a las personas en cosas. Trabajó en una fábrica y vio la opresión del trabajo. Sostiene que las obligaciones hacia los demás vienen antes que los derechos, y que el desarraigo destruye a las personas", voz: "intensa, austera, exige coherencia entre lo que se piensa y lo que se vive" },
  { id: "FREIRE", nombre: "Paulo Freire", sistema: "Critica la educación bancaria (el docente deposita saber en alumnos pasivos) y propone una educación liberadora basada en el diálogo y en leer el mundo antes de leer la palabra. Habla de oprimidos y opresores, y de concientización", voz: "cercano, humano, usa ejemplos de alfabetización y de la gente común" },
  { id: "WOLLSTONECRAFT", nombre: "Mary Wollstonecraft", sistema: "Defiende que las mujeres son seres racionales y que su supuesta inferioridad viene de una educación que las mantiene dependientes y frívolas. Pide educación igual y derechos, en el marco de la Ilustración y de las revoluciones de su tiempo", voz: "firme, indignada con la injusticia, argumenta con claridad" },
];

// ---------------------------------------------------------------------------
// TEMAS (generales, para que cualquier trío tenga algo que decir) con una imagen cotidiana de ayuda
// ---------------------------------------------------------------------------
const TEMAS = [
  { tema: "el trabajo", ej: "un zapatero, una fábrica, un salario" },
  { tema: "la libertad", ej: "alguien que elige, alguien que no tiene opciones" },
  { tema: "el Estado y el poder", ej: "una ciudad, un reglamento, una autoridad" },
  { tema: "la felicidad", ej: "una vida tranquila frente a una vida intensa" },
  { tema: "la historia", ej: "un pueblo, una revolución, un cambio de época" },
  { tema: "el dinero", ej: "un mercado, una deuda, una moneda" },
  { tema: "la propiedad", ej: "una casa, un terreno, una herramienta" },
  { tema: "la justicia", ej: "un reparto, un juicio, un castigo" },
  { tema: "la educación", ej: "un aula, un maestro, un aprendiz" },
  { tema: "la amistad", ej: "dos amigos que discuten, un favor" },
  { tema: "el arte", ej: "una obra de teatro, una estatua, una canción" },
  { tema: "la naturaleza humana", ej: "un niño, una multitud, una persona sola" },
  { tema: "el tiempo libre", ej: "una tarde sin tareas, un día de descanso" },
  { tema: "la democracia", ej: "una votación, una asamblea, un jefe" },
  { tema: "el bien y el mal", ej: "una promesa rota, un acto de valentía" },
  { tema: "el cambio", ej: "una semilla, un río, una ciudad que crece" },
  { tema: "la familia", ej: "una casa con hijos, una herencia" },
  { tema: "la religión y la fe", ej: "un templo, una duda, un ritual" },
  { tema: "el futuro", ej: "un plan, una promesa, un riesgo" },
  { tema: "la técnica y las máquinas", ej: "un telar, una herramienta, una fábrica automática" },
  { tema: "la muerte", ej: "un velorio, un anciano, un miedo antes de dormir" },
  { tema: "la verdad", ej: "un testigo, un rumor, una prueba" },
  { tema: "el conocimiento y la duda", ej: "un viajero que no sabe si lo que ve es real" },
  { tema: "el amor", ej: "una pareja, un padre, un amigo" },
  { tema: "la igualdad", ej: "un reparto de pan, una carrera con distintas salidas" },
  { tema: "la guerra y la paz", ej: "una frontera, un tratado, un soldado" },
  { tema: "los derechos y los deberes", ej: "un contrato, una promesa, una obligación" },
  { tema: "la obediencia y la desobediencia", ej: "una ley injusta, un vecino que se niega a cumplirla" },
  { tema: "la mente y el cuerpo", ej: "el hambre, un pensamiento, un dolor de muelas" },
  { tema: "el lenguaje", ej: "una palabra que significa cosas distintas, un malentendido" },
  { tema: "la soledad", ej: "una casa vacía, un ermitaño, una ciudad llena de gente" },
  { tema: "el miedo", ej: "una noche oscura, un examen, una amenaza" },
  { tema: "la ambición y el éxito", ej: "un comerciante, un artesano, un rey" },
  { tema: "la ciudad y la vida en común", ej: "una plaza, un vecindario, un mercado" },
  { tema: "el consumo y los deseos", ej: "una vidriera, una necesidad, un capricho" },
  { tema: "la mentira", ej: "una excusa, un rumor, un secreto" },
  { tema: "el sentido de la vida", ej: "alguien que se pregunta para qué se levanta cada mañana" },
  { tema: "la responsabilidad", ej: "un error con consecuencias, un cargo, una orden" },
];

// Formas de cerrar. Se aplican a quien habla último en el orden sorteado.
const FINALES = [
  (u) => `${u} concede un punto a otro y reconoce que su postura tenía un hueco`,
  () => "quedan en desacuerdo, pero cada uno se lleva una idea de otro",
  (u) => `${u} cierra con una pregunta abierta que los tres reconocen que no pueden resolver todavía`,
  (u) => `${u} propone una síntesis parcial entre dos de ellos, que el tercero había cuestionado`,
  (u) => `${u} tiene la última palabra, con una frase breve y filosa`,
  (u) => `${u} cierra con una pregunta simple que reabre todo`,
  (u) => `${u} cierra mostrando cómo lo discutido encaja con su manera de ver las cosas, pero sin imponerla`,
];

// Orden de turnos al azar: no siempre 1-2-3. Nadie habla dos veces seguidas, todos hablan al menos 3 veces,
// y hay al menos dos "duelos" (A, B, A) para que el tercero tenga que meterse a veces.
function sortearOrden(ids) {
  const n = 12 + Math.floor(Math.random() * 5); // 12 a 16 intervenciones
  const cuenta = (seq, id) => seq.filter((x) => x === id).length;
  let ultimo = null;
  for (let intento = 0; intento < 60; intento++) {
    const seq = [pick(ids)];
    while (seq.length < n) {
      const prev = seq[seq.length - 1];
      const opts = ids.filter((i) => i !== prev);
      const max = Math.max(...ids.map((i) => cuenta(seq, i)));
      // Más peso a quien menos habló, pero con margen para que cualquiera se meta
      const pesos = opts.map((i) => 1 + (max - cuenta(seq, i)) * 1.5 + (seq.length > 1 && seq[seq.length - 2] === i ? 0.8 : 0));
      let r = Math.random() * pesos.reduce((a, b) => a + b, 0), k = 0;
      while (k < opts.length - 1 && r >= pesos[k]) { r -= pesos[k]; k++; }
      seq.push(opts[k]);
    }
    ultimo = seq;
    let duelos = 0;
    for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 2]) duelos++;
    if (ids.every((i) => cuenta(seq, i) >= 3) && duelos >= 2) return seq;
  }
  return ultimo;
}

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

const lista = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " y " + a[a.length - 1]);

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "No autorizado. Iniciá sesión." });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json(500, { error: "Falta configurar DEEPSEEK_API_KEY en Netlify." });

  const semilla = Math.random().toString(36).slice(2, 8);

  // Tres filósofos distintos, al azar
  const pool = FILOSOFOS.slice();
  const trio = [];
  while (trio.length < 3) trio.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const ids = trio.map((f) => f.id);
  const orden = sortearOrden(ids);
  const tema = pick(TEMAS);
  const ultimo = orden[orden.length - 1];
  const final = pick(FINALES)(ultimo);
  const nombres = trio.map((f) => f.nombre);

  const system =
    "Sos un divulgador de filosofía excepcional: sabés llevar ideas de alto nivel a un lenguaje simple sin traicionarlas, y escribís diálogos con tensión real, donde cada personaje responde a lo que dijo el otro. Conocés a fondo la obra de todos los filósofos que se te pidan. Respondés SIEMPRE con un único objeto JSON válido, sin texto extra, con las comillas dobles internas correctamente escapadas.";

  const personajes = trio.map((f) => `- ${f.id} (${f.nombre}): ${f.sistema}. Voz: ${f.voz}.`).join("\n");
  const ordenTxt = orden.map((id, i) => `${i + 1}. ${id}`).join("\n");

  const user_prompt = `Escribí un debate filosófico breve entre ${lista(nombres)}, en español, de entre 240 y 300 palabras en total. Es solamente una conversación: sin escena, sin acotaciones, sin descripciones de acciones, sin narrador, sin corchetes ni paréntesis, sin asteriscos. Solo lo que dicen, nada más.

PERSONAJES (los tres, siempre; no agregues otros). Es un encuentro imaginario, fuera del tiempo: los tres conocen las ideas de los demás y pueden responderse, aunque hayan vivido en épocas distintas. No digas que es imaginario ni hables de la época de cada uno. Cada uno habla desde sus ideas reales y su propio sistema:
${personajes}

TEMA SORTEADO: ${tema.tema}. Si el tema no fue central para alguno, que lo aborde desde los principios de su sistema, sin atribuirle frases ni tesis que no sostuvo. Si hay posiciones muy distintas entre ellos, que el debate se apoye en esas diferencias reales, con precisión; no las recites todas como lista.

ORDEN EXACTO DE LAS INTERVENCIONES (respetalo tal cual; son ${orden.length}, en este orden):
${ordenTxt}
El orden no es una ronda ordenada: a veces alguien se mete en medio de un duelo entre los otros dos, interrumpe, defiende a uno o ataca al que acaba de hablar. Cuando le toca hablar a alguien que "no esperaba" el turno, su intervención entra directo a la discusión (responde a lo que acaba de decir el anterior, o retoma algo que dijo antes otro) y se nota que se metió. Las intervenciones tienen largo variado: algunas de una sola frase corta (interrupciones, objeciones secas), otras de dos o tres oraciones.

CÓMO DEBE SER EL DEBATE: lenguaje simple pero de alto nivel. Palabras de todos los días y frases cortas, como si se lo explicaran a una persona inteligente que nunca estudió filosofía; si aparece un concepto técnico, se explica en la misma conversación con una imagen o un ejemplo concreto, sin glosario aparte. Que haya argumentos de verdad: objeciones, contraejemplos, concesiones. Cada intervención responde directamente a lo que dijo el anterior y lo retoma, lo corrige o lo lleva más lejos (que se retroalimenten; nada de tres monólogos paralelos). En algún momento dos de ellos coinciden contra el tercero y luego se reordena la discusión. Cada uno se mantiene fiel a su pensamiento real, pero puede cambiar un matiz al escuchar a otro. Ejemplos concretos y cotidianos (por ejemplo: ${tema.ej}). Tono serio, con algún toque de humor seco o ironía sutil, sin disparates ni chistes absurdos. Se tratan con respeto, aunque discutan fuerte.

RIGOR: no atribuyas a nadie una idea que no sostuvo. No inventes citas textuales. Podés usar una frase famosa solo si estás completamente seguro de que es real y de quién es; si no, parafraseá la idea. Si alguno sostuvo algo hoy inaceptable (por ejemplo la esclavitud o la inferioridad de las mujeres), que lo diga como lo sostuvo y que los otros lo cuestionen con firmeza, sin justificarlo.

ARRANQUE Y FINAL: Empieza hablando ${orden[0]}, con algo que atrape y plantee el asunto con una pregunta o una afirmación fuerte. Cierre: ${final}. Que la última línea quede resonando. Sin moraleja explícita. Sin emojis ni palabras en otros idiomas. Variedad: semilla de esta ejecución, ${semilla}.

FORMATO: "dialogo" es una lista de exactamente ${orden.length} intervenciones, en el ORDEN EXACTO indicado arriba, cada una con "personaje" (exactamente uno de estos: ${ids.join(", ")}) y "texto" (lo que dice, de una a tres oraciones, nada más). Los tres tienen que hablar. No agregues título, explicaciones, comentarios ni notas.

Devolvé exactamente este JSON:
{"dialogo":[{"personaje":"${orden[0]}","texto":"..."}]}`;

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

    // Solo los tres filósofos sorteados, y solo lo que dicen
    const claves = trio.map((f) => ({ id: f.id, k: norm(f.id) }));
    const dialogo = (Array.isArray(out.dialogo) ? out.dialogo : [])
      .map((d) => {
        const n = norm(d && (d.personaje || d.actor));
        const hit = n && claves.find((c) => n === c.k || n.includes(c.k) || (n.length >= 4 && c.k.includes(n)));
        return { personaje: hit ? hit.id : "", texto: limpiar(d && d.texto) };
      })
      .filter((d) => d.personaje && d.texto);
    if (dialogo.length < 5 || new Set(dialogo.map((d) => d.personaje)).size < 2) throw new Error("el debate salió incompleto, probá de nuevo");

    return json(200, { dialogo, tema: tema.tema, filosofos: nombres });
  } catch (e) {
    return json(500, { error: "No se pudo generar el debate (" + (e.name === "TimeoutError" ? "tiempo agotado" : e.message) + ")" });
  }
};

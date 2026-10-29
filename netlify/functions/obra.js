// Netlify Function: DeepSeek diseña el PLAN de una obra (no el código). El pintor está en index.html.
// Variable de entorno: DEEPSEEK_API_KEY (usá el mismo nombre que en poema.js si es otro).
const MOV = ["romanticismo","impresionismo","barroco","tenebrismo","expresionismo","minimalismo","simbolismo","realismo","posimpresionismo","expresionismo abstracto","arte metafísico","luminismo"];
const ANIMO = ["melancolía","calma","inquietud","soledad","asombro","nostalgia","tensión","silencio","fervor","ensueño"];
const pick = a => a[Math.floor(Math.random() * a.length)];
const H = { "Content-Type": "application/json" };

exports.handler = async (event, context) => {
  if (!context.clientContext || !context.clientContext.user) return { statusCode: 401, headers: H, body: JSON.stringify({ error: "no autorizado" }) };
  const sys = `Sos un pintor que planifica una obra en escala de grises que será ejecutada por un algoritmo. Respondé SOLO un JSON con estas claves y valores exactos:
titulo (string, original, ≤60 caracteres), genero ("paisaje"|"marina"|"naturaleza_muerta"|"campos"|"vortice"),
composicion ("tercios"|"aurea"|"centrada"|"diagonal"|"triangular"), luz ("izquierda"|"derecha"|"arriba"), clave ("alta"|"media"|"baja"),
pincelada ("suave"|"empastada"|"fluida"|"fina"), formato ("horizontal"|"vertical"|"cuadrado"),
contraste (0 a 1), horizonte (0.28 a 0.7; altura del horizonte), densidad (0.15 a 1; cantidad de elementos), neblina (0 a 0.8),
referencias (array de 1 a 3 pintores reales), explicacion (string en español rioplatense, primera persona, 4 a 6 oraciones, máx. 650 caracteres: qué quisiste hacer, por qué esa composición, luz y tono, y qué querés que sienta quien la mire).
"vortice" es un cielo nocturno en remolinos con ciprés y pueblo; "campos" son bloques de color difuminados tipo Rothko.`;
  const usr = `Inspiración de esta vez: movimiento ${pick(MOV)}, ánimo de ${pick(ANIMO)}. Elegí libremente el género y los parámetros; sorprendeme.`;
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.DEEPSEEK_API_KEY },
      body: JSON.stringify({ model: "deepseek-chat", temperature: 1.3, max_tokens: 700, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: usr }] })
    });
    if (!r.ok) throw new Error("DeepSeek " + r.status);
    const j = await r.json();
    return { statusCode: 200, headers: H, body: JSON.stringify(JSON.parse(j.choices[0].message.content)) };
  } catch (e) { return { statusCode: 502, headers: H, body: JSON.stringify({ error: e.message }) }; }
};

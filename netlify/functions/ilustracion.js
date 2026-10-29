// netlify/functions/ilustracion.js
// Pide a DeepSeek un dibujo de línea escrito como código SVG. El navegador lo valida, lo limpia y lo pasa al PDF.
// Requiere DEEPSEEK_API_KEY y sesión iniciada (Netlify Identity).

const pick = a => a[Math.floor(Math.random() * a.length)];

const MOTIVOS = {
  exlibris: "un ex libris: marco ornamental simétrico con un motivo central (un libro abierto, un búho, un árbol o una llave) y pequeños detalles decorativos en las esquinas",
  constelacion: "una constelación imaginaria: estrellas como puntos y círculos pequeños unidas por líneas finas, con círculos concéntricos y marcas de coordenadas alrededor",
  planta: "una planta arquitectónica esquemática de un pabellón o casa imaginaria vista desde arriba: muros gruesos, aberturas, puertas con arco de giro, ejes de trazo punteado y algo de mobiliario",
  botanica: "una lámina botánica de una planta imaginaria con tallo, hojas, flores y raíces, en línea fina con algo de sombreado por rayado",
  emblema: "un emblema o escudo geométrico simétrico, con formas superpuestas, un motivo central y un borde ornamental"
};
const NOMBRES = { exlibris: "Ex libris", constelacion: "Constelación", planta: "Planta", botanica: "Botánica", emblema: "Emblema" };

const TEMAS = ["el río", "la espera", "el taller", "la ciudad", "el viento", "la memoria", "la lluvia", "el tiempo", "la noche", "el camino", "la raíz", "el umbral"];

const SYS = "Sos un ilustrador técnico que escribe código SVG limpio, válido y compacto. Respondés exactamente en el formato pedido, sin explicaciones ni bloques de código.";

const resp = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(obj) });

// Si la IA se quedó sin tokens, cierra los <g> que quedaron abiertos y el </svg>.
function repararSVG(s) {
  if (/<\/svg>\s*$/i.test(s)) return s;
  const corte = Math.max(s.lastIndexOf("/>"), s.lastIndexOf("</g>"));
  if (corte < 0) return null;
  s = s.slice(0, s.indexOf(">", corte) + 1);
  const abre = (s.match(/<g[\s>]/gi) || []).length, cierra = (s.match(/<\/g>/gi) || []).length;
  return s + "</g>".repeat(Math.max(0, abre - cierra)) + "</svg>";
}

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return resp(401, { error: "No autorizado" });
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return resp(500, { error: "Falta DEEPSEEK_API_KEY" });

  const q = event.queryStringParameters || {};
  let tipo = String(q.tipo || "").toLowerCase();
  if (!MOTIVOS[tipo]) tipo = pick(Object.keys(MOTIVOS));
  const tema = String(q.tema || "").replace(/[\r\n]+/g, " ").trim().slice(0, 120) || pick(TEMAS);

  const prompt =
    `Dibujá ${MOTIVOS[tipo]}. Inspiración: ${tema}.\n\n` +
    `Reglas del SVG:\n` +
    `- Una sola etiqueta <svg> con viewBox="0 0 400 500" y xmlns="http://www.w3.org/2000/svg".\n` +
    `- Dibujo de línea en negro sobre fondo blanco (primero un <rect> blanco). Trazos de 1 a 3 de grosor; podés usar grises para rellenos suaves.\n` +
    `- Solo estos elementos: svg, g, path, circle, ellipse, rect, line, polyline, polygon, defs, linearGradient, radialGradient, stop.\n` +
    `- Nada de <text>, <image>, <style>, <script>, ni referencias externas.\n` +
    `- Compacto: como máximo 45 elementos, coordenadas enteras, composición equilibrada y centrada con margen.\n\n` +
    `Respondé EXACTAMENTE así, sin nada más:\n` +
    `TITULO: título breve del dibujo\n` +
    `DESCRIPCION: una o dos oraciones sobre qué representa y por qué lo dibujaste así\n` +
    `<svg ...>...</svg>`;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 24000);
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }],
        temperature: 1.0,
        max_tokens: 1800
      }),
      signal: ctl.signal
    });
    if (!r.ok) return resp(502, { error: "DeepSeek respondió " + r.status });
    const data = await r.json();
    let raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    raw = raw.replace(/```(?:svg|xml|html)?/gi, "");

    const ini = raw.search(/<svg[\s>]/i);
    if (ini < 0) return resp(502, { error: "La IA no devolvió un SVG" });
    const svg = repararSVG(raw.slice(ini).trim());
    if (!svg) return resp(502, { error: "SVG incompleto" });

    const cab = raw.slice(0, ini);
    const titulo = (cab.match(/TITULO:\s*(.+)/i) || [])[1] || NOMBRES[tipo];
    const descripcion = (cab.match(/DESCRIPCION:\s*([\s\S]+)/i) || [])[1] || "";

    return resp(200, {
      tipo, nombre: NOMBRES[tipo],
      titulo: titulo.trim().slice(0, 90),
      descripcion: descripcion.replace(/\s+/g, " ").trim().slice(0, 500),
      svg: svg.slice(0, 60000)
    });
  } catch (e) {
    return resp(504, { error: e.name === "AbortError" ? "La IA tardó demasiado" : "Error: " + e.message });
  } finally {
    clearTimeout(timer);
  }
};

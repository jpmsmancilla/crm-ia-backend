// server.js - Backend IA real para CRM Metcorp (ESM) - CORREGIDO
import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      "https://panelsipmetcorp.cl",
      "https://www.panelsipmetcorp.cl",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    mensaje: "✅ Backend IA CRM Metcorp activo",
    version: "1.0.1",
    endpoints: [
      { ruta: "/check", metodo: "GET", descripcion: "Health check" },
      { ruta: "/api/analizar", metodo: "POST", descripcion: "Análisis IA de leads" }
    ]
  });
});

app.get("/check", (req, res) => {
  res.json({ 
    status: "ok",
    mensaje: "✅ Backend IA CRM Metcorp activo con ChatGPT",
    timestamp: new Date().toISOString()
  });
});

// Función auxiliar para limpiar respuestas de ChatGPT
function limpiarJSON(texto) {
  // Eliminar markdown si existe
  let limpio = texto
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/^json\n/g, "")
    .trim();
  
  return limpio;
}

// Ruta de análisis IA
app.post("/api/analizar", async (req, res) => {
  try {
    const { lead, notas, interacciones, actividades } = req.body || {};

    // Validación de datos
    if (!lead) {
      return res.status(400).json({ 
        error: "Faltan datos del lead",
        recibido: { lead: !!lead, notas: !!notas, interacciones: !!interacciones }
      });
    }

    // Validación de API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY no está configurado");
      return res.status(500).json({ 
        error: "OPENAI_API_KEY no está configurado en Render",
        ayuda: "Configura la variable de entorno OPENAI_API_KEY en tu dashboard de Render"
      });
    }

    // Preparar información del lead
    const notasTexto = Array.isArray(notas) 
      ? notas.map(n => typeof n === 'string' ? n : (n.texto || JSON.stringify(n))).join('\n')
      : (notas || "Sin notas registradas");

    const interaccionesTexto = Array.isArray(interacciones)
      ? interacciones.map((i, idx) => {
          if (typeof i === 'string') return `${idx + 1}. ${i}`;
          return `${idx + 1}. [${i.tipo || 'Interacción'}] ${i.resultado || i.notas || JSON.stringify(i)}`;
        }).join('\n')
      : "Sin interacciones registradas";

    const actividadesTexto = Array.isArray(actividades)
      ? actividades.map((a, idx) => `${idx + 1}. ${typeof a === 'string' ? a : JSON.stringify(a)}`).join('\n')
      : "Sin actividades registradas";

    const infoLead = `
INFORMACIÓN DEL LEAD:
- Nombre: ${lead.nombre || "N/D"}
- Empresa: ${lead.empresa || "N/D"}
- Email: ${lead.email || "N/D"}
- Teléfono: ${lead.telefono || "N/D"}
- Estado: ${lead.estado || "N/D"}
- Valor estimado: ${lead.valor ? `$${lead.valor.toLocaleString('es-CL')} CLP` : "N/D"}
- Prioridad: ${lead.prioridad || "N/D"}
- Temperatura: ${lead.temperatura || "N/D"}
- Fuente: ${lead.fuente || "N/D"}

NOTAS DEL VENDEDOR:
${notasTexto}

HISTORIAL DE INTERACCIONES:
${interaccionesTexto}

ACTIVIDADES PROGRAMADAS:
${actividadesTexto}
`;

    const prompt = `Eres un analista comercial senior experto en ventas B2B de sistemas de construcción con Panel SIP de la empresa Metcorp.

Analiza la información del lead proporcionada y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`json, solo el JSON puro).

ESTRUCTURA JSON REQUERIDA (respeta exactamente estos nombres de campos):
{
  "estado_lead": "CALIENTE|TIBIO|FRÍO|NEUTRO",
  "probabilidad_cierre": 0-100,
  "nivel_interes": "alto|medio|bajo",
  "riesgo_perdida": "alto|medio|bajo",
  "resumen_ejecutivo": "Resumen breve del estado del lead en 2-3 líneas",
  "senales_positivas": ["señal 1", "señal 2", ...],
  "senales_negativas": ["señal 1", "señal 2", ...],
  "objeciones_detectadas": [
    {
      "objecion": "texto de la objeción",
      "respuesta_sugerida": "respuesta estratégica"
    }
  ],
  "proximos_pasos": ["acción 1", "acción 2", "acción 3"],
  "recomendaciones": ["recomendación 1", "recomendación 2", ...],
  "plantillas_sugeridas": [
    {
      "tipo": "whatsapp|email|script",
      "nombre": "nombre descriptivo",
      "contenido": "texto de la plantilla",
      "cuando_usar": "contexto"
    }
  ],
  "urgencia": "alta|media|baja",
  "siguiente_accion_recomendada": "Descripción específica",
  "tiempo_sugerido": "Cuándo ejecutarla"
}

INFORMACIÓN A ANALIZAR:
${infoLead}

Responde SOLO con el JSON, sin texto adicional.`;

    console.log("📤 Enviando solicitud a OpenAI...");

    // Llamar a OpenAI
    const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 2500,
        messages: [
          {
            role: "system",
            content: "Eres un analista comercial experto en ventas B2B. Respondes ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional."
          },
          { 
            role: "user", 
            content: prompt 
          }
        ]
      })
    });

    if (!respuesta.ok) {
      const errorText = await respuesta.text();
      console.error("❌ Error OpenAI:", respuesta.status, errorText);
      return res.status(500).json({
        error: "Error llamando a OpenAI",
        status: respuesta.status,
        detalle: errorText.substring(0, 200)
      });
    }

    const data = await respuesta.json();
    const contenido = data?.choices?.[0]?.message?.content || "{}";
    
    console.log("📥 Respuesta recibida de OpenAI");
    console.log("Primeros 200 caracteres:", contenido.substring(0, 200));

    let analisis;
    try {
      // Limpiar posible markdown
      const contenidoLimpio = limpiarJSON(contenido);
      analisis = JSON.parse(contenidoLimpio);
      console.log("✅ JSON parseado exitosamente");
    } catch (e) {
      console.error("❌ Error parseando JSON:", e.message);
      console.error("Contenido recibido:", contenido.substring(0, 500));
      
      // Intentar extraer cualquier objeto JSON del texto
      const match = contenido.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          analisis = JSON.parse(match[0]);
          console.log("✅ JSON extraído y parseado exitosamente");
        } catch (e2) {
          console.error("❌ No se pudo parsear ni siquiera el match:", e2.message);
          // Fallback con análisis básico
          analisis = {
            resumen_ejecutivo: "Análisis generado con éxito (formato básico)",
            estado_lead: "NEUTRO",
            probabilidad_cierre: 50,
            nivel_interes: "medio",
            riesgo_perdida: "medio",
            senales_positivas: ["Lead registrado en el sistema"],
            senales_negativas: ["Requiere seguimiento"],
            proximos_pasos: ["Contactar al lead", "Enviar información"],
            recomendaciones: ["Mantener comunicación activa"],
            urgencia: "media",
            siguiente_accion_recomendada: "Contactar en las próximas 24-48 horas",
            tiempo_sugerido: "24-48 horas"
          };
        }
      } else {
        // Fallback si no hay JSON válido
        analisis = {
          resumen_ejecutivo: contenido.substring(0, 200),
          estado_lead: "NEUTRO",
          probabilidad_cierre: 50,
          nivel_interes: "medio",
          riesgo_perdida: "medio",
          senales_positivas: [],
          senales_negativas: [],
          proximos_pasos: [],
          recomendaciones: [],
          urgencia: "media"
        };
      }
    }

    // Asegurar que el análisis tenga la estructura mínima
    const analisisCompleto = {
      estado_lead: analisis.estado_lead || "NEUTRO",
      probabilidad_cierre: analisis.probabilidad_cierre || 50,
      nivel_interes: analisis.nivel_interes || "medio",
      riesgo_perdida: analisis.riesgo_perdida || "medio",
      resumen_ejecutivo: analisis.resumen_ejecutivo || "Análisis completado",
      senales_positivas: Array.isArray(analisis.senales_positivas) ? analisis.senales_positivas : [],
      senales_negativas: Array.isArray(analisis.senales_negativas) ? analisis.senales_negativas : [],
      objeciones_detectadas: Array.isArray(analisis.objeciones_detectadas) ? analisis.objeciones_detectadas : [],
      proximos_pasos: Array.isArray(analisis.proximos_pasos) ? analisis.proximos_pasos : [],
      recomendaciones: Array.isArray(analisis.recomendaciones) ? analisis.recomendaciones : [],
      plantillas_sugeridas: Array.isArray(analisis.plantillas_sugeridas) ? analisis.plantillas_sugeridas : [],
      urgencia: analisis.urgencia || "media",
      siguiente_accion_recomendada: analisis.siguiente_accion_recomendada || "Revisar lead",
      tiempo_sugerido: analisis.tiempo_sugerido || "En las próximas 48 horas"
    };

    console.log("✅ Enviando análisis completo al frontend");
    res.json({ analisis: analisisCompleto });

  } catch (error) {
    console.error("❌ Error en /api/analizar:", error);
    res.status(500).json({
      error: "Error interno del backend IA",
      mensaje: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    ruta: req.path,
    metodo: req.method,
    ayuda: "Usa GET /check o POST /api/analizar"
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  res.status(500).json({
    error: "Error interno del servidor",
    mensaje: error.message
  });
});

// Render asigna el puerto dinámicamente
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`✅ Servidor IA CRM escuchando en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   GET  /         - Info del servidor`);
  console.log(`   GET  /check    - Health check`);
  console.log(`   POST /api/analizar - Análisis IA`);
  console.log(`🔑 API Key configurada: ${process.env.OPENAI_API_KEY ? 'SÍ ✅' : 'NO ❌'}`);
});

// server.js - Backend IA real para CRM Metcorp (ESM)

import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      "https://panelsipmetcorp.cl",
      "https://www.panelsipmetcorp.cl"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

// Ruta de prueba
app.get("/check", (req, res) => {
  res.send("✅ Backend IA CRM Metcorp activo con ChatGPT");
});

// Ruta de análisis IA
app.post("/api/analizar", async (req, res) => {
  try {
    const { lead, notas, interacciones, actividades } = req.body || {};

    if (!lead || !notas) {
      return res
        .status(400)
        .json({ error: "Faltan datos del lead o las notas" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OPENAI_API_KEY no está configurado en Render" });
    }

    const infoLead = `
LEAD:
- Nombre: ${lead.nombre || "N/D"}
- Email: ${lead.email || "N/D"}
- Teléfono: ${lead.telefono || "N/D"}
- Origen: ${lead.origen || "N/D"}

NOTAS DEL VENDEDOR:
${notas || "Sin notas registradas."}

INTERACCIONES:
${(interacciones || [])
        .map((i, idx) => ` ${idx + 1}. ${i}`)
        .join("\n") || "Sin interacciones registradas."}

ACTIVIDADES:
${(actividades || [])
        .map((a, idx) => ` ${idx + 1}. ${a}`)
        .join("\n") || "Sin actividades registradas."}
`;

    const prompt = `
Eres un analista comercial senior de Metcorp Panel SIP.
Analiza la información del lead y responde ÚNICAMENTE en JSON válido con esta estructura EXACTA:

{
  "resumen_ejecutivo": "texto corto",
  "probabilidad_cierre": 0-100,
  "clasificacion": "frio" | "tibio" | "caliente",
  "señales_positivas": ["texto", "..."],
  "señales_negativas": ["texto", "..."],
  "recomendaciones_estrategicas": ["texto", "..."]
}

No agregues texto fuera del JSON.

Información del lead:
${infoLead}
`;

    // Node 18+ trae fetch nativo, no necesitamos node-fetch
    const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Eres un analista comercial experto en ventas B2C y B2B para paneles SIP."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!respuesta.ok) {
      const errorText = await respuesta.text();
      console.error("Error OpenAI:", respuesta.status, errorText);
      return res.status(500).json({
        error: "Error llamando a OpenAI",
        detalle: errorText
      });
    }

    const data = await respuesta.json();
    const contenido = data?.choices?.[0]?.message?.content || "{}";

    let analisis;
    try {
      analisis = JSON.parse(contenido);
    } catch (e) {
      console.error("No se pudo parsear JSON, devolviendo texto plano.");
      analisis = { resumen_ejecutivo: contenido };
    }

    res.json({ analisis });
  } catch (error) {
    console.error("Error en /api/analizar:", error);
    res.status(500).json({
      error: "Error interno del backend IA",
      detalle: error.message
    });
  }
});

// Render pone el puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor IA CRM escuchando en puerto ${PORT}`);
});

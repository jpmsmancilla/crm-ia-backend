import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Ruta de verificación
app.get("/check", (req, res) => {
  res.send("✅ Backend IA CRM Metcorp activo");
});

// 🔹 Ruta de análisis IA
app.post("/api/analizar", async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto) {
      return res.status(400).json({ error: "Falta el texto a analizar" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un analista comercial de Metcorp Panel SIP." },
          { role: "user", content: texto }
        ],
      }),
    });

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || "Sin respuesta válida";
    res.json({ analisis: result });

  } catch (error) {
    console.error("Error en /api/analizar:", error);
    res.status(500).json({ error: "Error interno en el servidor IA" });
  }
});

// Render asigna el puerto automáticamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor IA activo en puerto ${PORT}`));

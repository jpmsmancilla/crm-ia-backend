const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["https://panelsipmetcorp.cl", "https://www.panelsipmetcorp.cl"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.get("/check", (req, res) => {
  res.send("Backend IA CRM Metcorp activo");
});

app.post("/api/analizar", async (req, res) => {
  try {
    const { lead, notas, interacciones, actividades } = req.body || {};

    if (!lead) {
      return res.status(400).json({ error: "Faltan datos del lead" });
    }

    const analisisDemo = {
      resumen_ejecutivo:
        "Este es un análisis de PRUEBA desde el backend (aún sin ChatGPT).",
      probabilidad_cierre: 60,
      clasificacion: "tibio",
      señales_positivas: ["Backend IA respondió correctamente"],
      señales_negativas: [],
      recomendaciones_estrategicas: [
        "Conectar esta API a tu CRM y luego activar ChatGPT."
      ]
    };

    res.json({ analisis: analisisDemo });
  } catch (error) {
    console.error("Error en /api/analizar:", error);
    res
      .status(500)
      .json({ error: "Error interno del backend IA", detalle: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor IA CRM escuchando en puerto ${PORT}`);
});

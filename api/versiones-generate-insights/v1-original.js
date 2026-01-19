// api/generate-insights.js
// Vercel Serverless Function para generar insights de forma SEGURA
// Con integración automática de Braintrust usando wrapOpenAI

import { OpenAI } from 'openai';
import { wrapOpenAI, initLogger } from 'braintrust';

// Inicializar el logger de Braintrust
// Esto crea el proyecto en Braintrust si no existe
const logger = initLogger({
  projectName: 'cpq-insights',
  apiKey: process.env.BRAINTRUST_API_KEY,
});

// Inicializar OpenAI con wrapper de Braintrust
// wrapOpenAI() captura AUTOMÁTICAMENTE todas las llamadas como traces
const openai = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Validar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split('Bearer ')[1];
    const userId = token.substring(0, 10);

    // 2. Obtener datos del request
    const { completeData } = req.body;

    if (!completeData) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // 3. Validar tamaño de datos
    const dataSize = JSON.stringify(completeData).length;
    const MAX_SIZE = 500000;
    
    if (dataSize > MAX_SIZE) {
      return res.status(413).json({ 
        error: 'Datos muy grandes', 
        maxSize: MAX_SIZE,
        currentSize: dataSize 
      });
    }

    const startTime = Date.now();
    console.log('🤖 Generando insights con IA...');

    // 4. Llamar a OpenAI (automáticamente tracked por Braintrust)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un analista de negocios experto en CPQ y ventas B2B. 
Analiza los datos proporcionados y genera insights ESPECÍFICOS, ACCIONABLES y PROFUNDOS.
No hagas afirmaciones genéricas. Usa números concretos y nombres específicos.
Identifica patrones ocultos, tendencias y oportunidades que el usuario podría no haber notado.
Sé directo y enfócate en insights que generen valor real.
Responde en español y en formato JSON válido.`
        },
        {
          role: "user",
          content: `Analiza profundamente estos datos de mi negocio CPQ y genera insights valiosos:

${JSON.stringify(completeData, null, 2)}

Genera un JSON con insights específicos y accionables:
{
  "resumenEjecutivo": "Un párrafo con los hallazgos MÁS importantes y específicos",
  "insightsDescriptivos": [
    {
      "titulo": "Título específico del insight",
      "descripcion": "Explicación detallada con números y nombres concretos",
      "impacto": "alto|medio|bajo",
      "tipo": "oportunidad|advertencia|informacion"
    }
  ],
  "insightsPredictivos": [
    {
      "titulo": "Predicción o tendencia específica",
      "descripcion": "Explicación basada en los datos actuales",
      "confianza": "alta|media|baja",
      "tipo": "oportunidad|advertencia|informacion"
    }
  ],
  "recomendaciones": [
    {
      "titulo": "Acción específica recomendada",
      "descripcion": "Cómo implementarla y por qué es importante",
      "prioridad": "alta|media|baja",
      "impactoEstimado": "Descripción del impacto esperado"
    }
  ]
}

IMPORTANTE: 
- Usa NÚMEROS CONCRETOS de los datos
- Menciona NOMBRES ESPECÍFICOS de productos/clientes cuando sea relevante
- NO uses frases genéricas como "algunos productos" o "ciertos clientes"
- Cada insight debe ser ACCIONABLE
- Enfócate en hallazgos que el usuario no vería fácilmente en un dashboard simple`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const duration = Date.now() - startTime;
    const insightsText = completion.choices[0].message.content;
    const insights = JSON.parse(insightsText);
    const tokensUsed = completion.usage.total_tokens;
    const cost = (tokensUsed * 0.00002).toFixed(4);

    console.log('✅ Insights generados exitosamente');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: userId,
      tokensUsed: tokensUsed,
      cost: cost,
      duration: `${duration}ms`,
      dataSize: `${(dataSize / 1024).toFixed(2)}KB`,
      braintrustTracked: true
    }));

    return res.status(200).json({
      success: true,
      insights,
      metadata: {
        model: completion.model,
        tokensUsed: tokensUsed,
        cost: cost,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        braintrustTracked: true
      }
    });

  } catch (error) {
    console.error('❌ Error generando insights:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Límite de rate excedido. Intenta de nuevo en unos momentos.' 
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: 'Error de configuración del servidor' 
      });
    }

    return res.status(500).json({ 
      error: 'Error generando insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
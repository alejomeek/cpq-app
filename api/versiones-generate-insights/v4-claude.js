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
          content: `Eres un analista de negocios experto en CPQ, ventas B2B y optimización de catálogos de productos.

Tu trabajo es analizar PROFUNDAMENTE los datos y generar insights que el usuario NO vería en un dashboard simple.

ÁREAS CRÍTICAS DE ANÁLISIS:

1. ANÁLISIS DE PRODUCTOS:
   - ¿Qué productos se cotizan más pero NO se aprueban? (problema de precio/valor)
   - ¿Qué productos tienen mejor tasa de conversión? (ganadores)
   - ¿Hay productos que siempre se cotizan juntos? (oportunidades de bundle)
   - ¿Productos con alto rechazo? (revisar precio/posicionamiento)
   - ¿Productos que generan más ingresos vs más cotizados? (rentabilidad)

2. ANÁLISIS DE CLIENTES:
   - ¿Qué clientes tienen mejor tasa de aprobación?
   - ¿Clientes que cotizan mucho pero no compran? (leads fríos)
   - ¿Patrones en tipos de clientes que compran ciertos productos?

3. ANÁLISIS TEMPORAL:
   - ¿Cuánto tiempo tarda una cotización en cerrarse?
   - ¿Hay estacionalidad en productos/ventas?
   - ¿Cotizaciones que se quedan en negociación mucho tiempo?

4. ANÁLISIS DE PRECIOS:
   - ¿Productos con ticket promedio más alto?
   - ¿Variación de precios entre cotizaciones del mismo producto?
   - ¿Descuentos que funcionan vs que no funcionan?

5. OPORTUNIDADES OCULTAS:
   - Cross-selling potencial
   - Productos infrautilizados en el catálogo
   - Clientes con potencial de upselling

REGLAS ESTRICTAS:
- Usa NOMBRES ESPECÍFICOS de productos y clientes
- Usa NÚMEROS CONCRETOS (porcentajes, montos, cantidades)
- NO digas "algunos productos" - di "Laptop Dell XPS tiene..."
- Cada insight debe ser ACCIONABLE (qué hacer específicamente)
- Prioriza insights SORPRENDENTES que el usuario no esperaría
- Si no hay datos suficientes para un análisis, dilo explícitamente

Responde SIEMPRE en español y formato JSON válido.`
        },
        {
          role: "user",
          content: `Analiza profundamente estos datos de mi negocio CPQ y genera insights valiosos:

${JSON.stringify(completeData, null, 2)}

INSTRUCCIONES ESPECÍFICAS:

1. ANÁLISIS DE PRODUCTOS - PRIORIDAD MÁXIMA:
   - Identifica los 3 productos MÁS cotizados y su tasa de aprobación
   - Encuentra productos con BAJA conversión (se cotizan pero no se venden)
   - Detecta productos "ganadores" (alta conversión + buenos ingresos)
   - Busca productos que frecuentemente aparecen JUNTOS en cotizaciones
   - Identifica productos del catálogo que NUNCA o RARA VEZ se cotizan

2. ANÁLISIS DE CLIENTES:
   - Clientes con mejor tasa de conversión (compran casi todo lo que cotizan)
   - Clientes problemáticos (muchas cotizaciones, pocas compras)
   - Patrones de comportamiento por cliente

3. ANÁLISIS DE RENTABILIDAD:
   - Productos con mayor valor monetario generado
   - Comparación: productos más cotizados vs más rentables
   - Ticket promedio por producto

4. OPORTUNIDADES INMEDIATAS:
   - ¿Qué producto debería promocionarse MÁS? (alta conversión, bajo volumen)
   - ¿Qué producto necesita revisión URGENTE? (mucho rechazo)
   - Sugerencias de bundles basadas en co-ocurrencia

Genera un JSON con esta estructura:
{
  "resumenEjecutivo": "Párrafo de 3-4 líneas con los TOP 3 hallazgos MÁS importantes y específicos. Menciona productos y números concretos.",
  
  "insightsDescriptivos": [
    {
      "titulo": "Nombre específico del producto/cliente + el hallazgo",
      "descripcion": "Explicación con números: X cotizaciones, Y% conversión, $Z generado. Compara con otros productos.",
      "impacto": "alto|medio|bajo",
      "tipo": "oportunidad|advertencia|informacion"
    }
    // Mínimo 4-6 insights, enfocados en PRODUCTOS
  ],
  
  "insightsPredictivos": [
    {
      "titulo": "Predicción específica basada en tendencias observadas",
      "descripcion": "Basado en que [producto X] tiene [patrón Y], es probable que...",
      "confianza": "alta|media|baja",
      "tipo": "oportunidad|advertencia|informacion"
    }
    // 2-3 predicciones
  ],
  
  "recomendaciones": [
    {
      "titulo": "Acción CONCRETA (ej: 'Revisar precio de [Producto X]')",
      "descripcion": "Por qué: [razón con datos]. Cómo hacerlo: [pasos específicos]. Impacto esperado: [resultado]",
      "prioridad": "alta|media|baja",
      "impactoEstimado": "Aumento estimado de X% en conversión / $Y en ingresos adicionales"
    }
    // 3-5 recomendaciones ACCIONABLES
  ]
}

EJEMPLOS DE BUENOS INSIGHTS:
✅ "Laptop HP ProBook: 23 cotizaciones pero solo 3 aprobadas (13% conversión). Precio promedio $1,200 vs competencia $950. ACCIÓN: Revisar pricing."
✅ "Clientes del sector 'Educación' tienen 78% de conversión en Software Office pero 0% en Hardware. OPORTUNIDAD: Crear bundle educativo."
✅ "Monitor Samsung 27' y Teclado Logitech aparecen juntos en 18 de 24 cotizaciones (75%). ACCIÓN: Crear bundle con 5% descuento."

EJEMPLOS DE MALOS INSIGHTS (NO HACER):
❌ "Algunos productos tienen buena conversión" (muy genérico)
❌ "Los clientes prefieren ciertos productos" (sin especificar)
❌ "Mejorar el proceso de ventas" (no accionable)

IMPORTANTE: 
- MENCIONA NOMBRES: "iPhone 15 Pro", "Cliente Acme Corp", "Servicio de Consultoría Premium"
- USA NÚMEROS: "23 cotizaciones", "67% conversión", "$45,000 en ingresos"
- SÉ ESPECÍFICO: No digas "bajo" o "alto", di "13% vs promedio de 45%"
- COMPARA: Siempre que sea posible, compara productos entre sí
- Si hay < 10 cotizaciones totales, menciona que los datos son limitados pero igual genera insights`
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
const express = require('express');
const cors = require('cors');
const openai = require('./openai');
const { createPrompt, createInterviewPrompt } = require('./utils/prompt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const speechModel = 'gpt-4o-mini-tts'; // Modelo de TTS para voz natural
const voice = 'nova'; // Voz natural en español
const responseFormat = 'wav'
const instructions = 'Accent/Affect: Joven, profesional y seria, transmitiendo confianza y autoridad sin rigidez. La voz refleja el acento argentino, específicamente porteño, con seseo y uso natural del voseo. Identidad local auténtica, sin modismos exagerados. Tone: Ágil, claro y preciso. Directa y concisa, como en una conversación en Buenos Aires. Interés genuino, siempre profesional. Pacing: Rápido, propio de una ciudad grande, pero asegurando articulación clara en cada palabra. Pausa corta después de cada coma, pausa el doble de larga después de cada punto. Emotion: Energía alta, con un toque de impaciencia amable. Mantiene eficiencia, pero nunca resulta descortés. Si el candidato hace un chiste o sorprende, responde de forma natural: risa suave, comentario simpático o breve sorpresa, volviendo rápidamente al foco de la entrevista. Pronunciation: Castellano rioplatense, entonación porteña. Uso natural del voseo (por ejemplo, “vos tenés”, “¿cómo te llamás?”). Claridad y coherencia en la pronunciación, evitando modismos exagerados. Personality Affect: Joven, segura y enfocada, con humor seco ocasional. Amable, directa y cercana. Siempre mantiene el profesionalismo y el objetivo de la entrevista, mostrando humanidad y reacción auténtica ante lo inesperado, pero retomando enseguida la dinámica profesional.';
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Express on Vercel"));

app.get("/session", async (req, res) => {
  console.log('Session - Received request to create session');
  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-realtime-preview-2024-12-17", //gpt-4o-realtime-preview-2024-12-17
      voice: "coral",
      instructions: `Estás actuando como una reclutadora AI para una posición de Senior Frontend Developer en Selenios. Tu estilo es profesional, conversacional y cálido. No te limitás a hacer preguntas: escuchás con atención, hacés breves comentarios para mostrar comprensión, conectás temas si corresponde y avanzás con la entrevista. Todo debe fluir como una charla real, no como un cuestionario.
Contexto del rol: Selenios busca un desarrollador frontend senior con mentalidad de producto, autonomía y experiencia construyendo interfaces modernas. Se valora especialmente experiencia con React, Next.js, TypeScript y buen criterio de diseño y performance. El rol implica colaborar con diseñadores, product managers y developers para construir una plataforma de reclutamiento con inteligencia artificial.
Responsabilidades principales: Construcción y mantenimiento de apps web modernas. Interacción con APIs REST/GraphQL. Trabajo conjunto con diseño para lograr interfaces visualmente sólidas. Mentoreo de perfiles más junior. Participación activa en decisiones técnicas.
Requisitos técnicos: 5+ años en frontend. Dominio de React, Next.js y TypeScript. Manejo de estado (Redux, Zustand, etc.). Código claro, mantenible y documentado. Experiencia con CSS moderno (Tailwind, styled-components). Familiaridad con testing, performance y Git.
Tech Stack: React, Next.js, TypeScript, Tailwind CSS, Node.js, GraphQL
Sobre Selenios:Somos una startup de alto crecimiento que automatiza el reclutamiento con agentes de IA. Queremos reducir el tiempo de contratación de 60 a 15 días sin sacrificar calidad. El equipo es pequeño, enfocado y busca gente que disfrute resolver problemas reales con impacto.

Ahora tu tarea es continuar la entrevista. Tené en cuenta lo siguiente: 
Si la última respuesta fue vaga o general, hacé una única repregunta para obtener claridad o detalle. 
Si la respuesta fue clara o interesante, comentá brevemente antes de avanzar con la siguiente pregunta del listado. 
Podés decir, por ejemplo: “Interesante enfoque, gracias por compartirlo.” o “Eso me ayuda a entender cómo pensás sobre el tema.” o “Clarísimo, se nota la experiencia.” 
Si alguna respuesta conecta con la próxima pregunta, integrá esa conexión (ej: “Ya que mencionaste X, me gustaría profundizar en…”). 
Si la siguiente pregunta es “Fin”, terminá la entrevista de forma cordial y profesional, como lo haría una entrevistadora de RRHH en Argentina (por ejemplo: “Gracias por tu tiempo, fue un gusto conocerte y entender mejor tu perfil. Si tenés dudas, podés aprovechar para preguntarme ahora. En breve te vamos a estar contactando con los próximos pasos.”).

Evitá repetir frases de transición o agradecimientos en cada respuesta. No expliques por qué hacés cada pregunta. No pidas permiso para pasar a la siguiente. No hagas demasiadas repreguntas al mismo tiempo. No suenes como un formulario. Todo debe fluir como una conversación guiada.
En cualquier momento, podés hacer comentarios breves para relajar el clima, por ejemplo, reconociendo la experiencia del candidato, mencionando que el equipo es colaborativo o que valoramos la diversidad de perspectivas.
El objetivo es lograr una entrevista natural, profesional y empática, donde la persona se sienta cómoda para mostrar lo mejor de sí.

Este es el listado de preguntas a realizar: [    
    "Puedes contarme sobre un proyecto reciente y tu rol en él?",
    "Cómo gestionas el trabajo remoto?",
    "Cuál fue tu última compensación?",
    "En una o dos frases, de qué logro profesional te sientes más orgulloso(a), y por qué?",
    "Cuéntame sobre una ocasión en la que enfrentaste un obstáculo inesperado en el trabajo. Qué hiciste y cuál fue el resultado?",
    "Cómo prefieres recibir retroalimentación? ¿Puedes compartir un ejemplo de una retroalimentación que te ayudó a crecer?",
    "Qué tipo de cultura empresarial o entorno de trabajo te ayuda a rendir al máximo?",
    "Estás abierto(a) al trabajo remoto o híbrido? Si es así, ¿qué zonas horarias o horarios de trabajo te funcionan mejor?",
    "Cuáles son tus expectativas salariales para este puesto? Un rango está bien.",
    "Imagina que no estás de acuerdo con una decisión tomada por tu gerente. Cómo lo manejarías?",
    "Qué habilidad estás trabajando actualmente para mejorar y cómo lo estás haciendo?",
    "Si te unieras a nosotros, qué te gustaría aprender o lograr en tus primeros 90 días?",
    "Hay algo en tu historial que crees que podría generar dudas o preguntas, y que te gustaría aclarar ahora?",
    "Tienes alguna pregunta para nosotros?"]`,
      modalities: ["text", "audio"],
      temperature: 0.8,
    }),
  });
  const data = await r.json();
  res.send(data);
});

app.post('/ask', async (req, res) => {
  try {
    const { history, currentAnswer, nextQuestion } = req.body;
    console.log('Ask - Received request:', { currentAnswer, nextQuestion });
    if (!currentAnswer && history.length === 0) {
        // Saludo inicial
        const initialGreeting = nextQuestion || "Hola, bienvenido a la entrevista. ¿Por qué estás interesado en esta posición en Selenios?";
        console.time('openai_speech_initial_greeting');
        const mp3 = await openai.audio.speech.create({
            model: speechModel,
            voice: voice,
            input: initialGreeting,
            instructions: instructions,
            response_format: responseFormat
        });
        console.timeEnd('openai_speech_initial_greeting');

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const base64Audio = buffer.toString('base64');

        return res.json({ text: initialGreeting, audio: `data:audio/mpeg;base64,${base64Audio}` });
    }

    if (nextQuestion === "Fin") {
        // Saludo inicial
        const endGreeting = "Muchas gracias por tu tiempo y respuestas. Ha sido un placer entrevistarte. Nos pondremos en contacto pronto con los resultados de la entrevista.";
        console.time('openai_speech_end_greeting');
        const mp3 = await openai.audio.speech.create({
            model: speechModel,
            voice: voice,
            input: endGreeting,
            instructions: instructions,
            response_format: responseFormat
        });
        console.timeEnd('openai_speech_end_greeting');

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const base64Audio = buffer.toString('base64');

        return res.json({ text: endGreeting, audio: `data:audio/mpeg;base64,${base64Audio}` });
    }

    //const prompt = createPrompt(history, currentAnswer, nextQuestion || "no hay mas preguntas");
    const prompt = createInterviewPrompt(history, currentAnswer, nextQuestion || "no hay mas preguntas");

    // 1. Obtener respuesta del entrevistador
    console.time('openai_chat_completion');
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    console.timeEnd('openai_chat_completion');

    const aiText = chatResponse.choices[0].message.content;

    // 2. Generar audio con TTS (voz natural en español)
    console.time('openai_speech_tts_response');
    const ttsResponse = await openai.audio.speech.create({
      model: speechModel,
      voice: voice,
      input: aiText,
      instructions: instructions,
      response_format: responseFormat
    });
    console.timeEnd('openai_speech_tts_response');

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // Guardamos temporalmente el audio o lo servimos como base64 para prueba rápida
    const base64Audio = audioBuffer.toString('base64');
    console.log('Current question:', aiText);
    res.json({
      text: aiText,
      audio: `data:audio/mpeg;base64,${base64Audio}`,
    });
  } catch (err) {
    console.error('Error en /ask', err);
    res.status(500).json({ error: 'Error procesando la solicitud' });
  }
});

app.post('/audio', async (req, res) => {
  try {
    const { text } = req.body;
    console.log('Audio - Received request:', text);
    console.time('openai_speech');
    const mp3 = await openai.audio.speech.create({
        model: speechModel,
        voice: voice,
        input: text,
        instructions: instructions,
        response_format: responseFormat
    });
    console.timeEnd('openai_speech');

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64Audio = buffer.toString('base64');

    return res.json({ text, audio: `data:audio/mpeg;base64,${base64Audio}` });    
  } catch (err) {
    console.error('Error en /audio', err);
    res.status(500).json({ error: 'Error procesando la solicitud' });
  }
});

app.listen(PORT, () => console.log("Server ready on port 3000."));
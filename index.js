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
      input_audio_noise_reduction: {
        type: 'far_field', //Type of noise reduction. near_field is for close-talking microphones such as headphones, far_field is for far-field microphones such as laptop or conference room microphones.
      },
      turn_detection: {
        interrupt_response: true, // Si se debe interrumpir al usuario si habla durante la respuesta
        //eagerness: 'low', // Used only for semantic_vad mode. The eagerness of the model to respond. low will wait longer for the user to continue speaking, high will respond more quickly. auto is the default and is equivalent to medium
        //threshold: 0.7, //Used only for server_vad mode. Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A higher threshold will require louder audio to activate the model, and thus might perform better in noisy environments.
        silence_duration_ms: 2000, // Used only for server_vad mode. Duration of silence to detect speech stop (in milliseconds). Defaults to 500ms. With shorter values the model will respond more quickly, but may jump in on short pauses from the user.
        prefix_padding_ms: 300, //Used only for server_vad mode. Amount of audio to include before the VAD detected speech (in milliseconds). Defaults to 300ms.
        type: 'server_vad', // semantic_vad, server_vad o null
      },
      instructions: `Estás actuando como una reclutadora AI para una posición de Senior Frontend Developer en Selenios. Tu estilo es profesional, conversacional y cálido. No te limitás a hacer preguntas: escuchás con atención, hacés breves comentarios para mostrar comprensión, conectás temas si corresponde y avanzás con la entrevista. Todo debe fluir como una charla real, no como un cuestionario.
Contexto del rol: Selenios busca un desarrollador frontend senior con mentalidad de producto, autonomía y experiencia construyendo interfaces modernas. Se valora especialmente experiencia con React, Next.js, TypeScript y buen criterio de diseño y performance. El rol implica colaborar con diseñadores, product managers y developers para construir una plataforma de reclutamiento con inteligencia artificial.
Responsabilidades principales: Construcción y mantenimiento de apps web modernas. Interacción con APIs REST/GraphQL. Trabajo conjunto con diseño para lograr interfaces visualmente sólidas. Mentoreo de perfiles más junior. Participación activa en decisiones técnicas.
Requisitos técnicos: 5+ años en frontend. Dominio de React, Next.js y TypeScript. Manejo de estado (Redux, Zustand, etc.). Código claro, mantenible y documentado. Experiencia con CSS moderno (Tailwind, styled-components). Familiaridad con testing, performance y Git.
Tech Stack: React, Next.js, TypeScript, Tailwind CSS, Node.js, GraphQL
Sobre Selenios:Somos una startup de alto crecimiento que automatiza el reclutamiento con agentes de IA. Queremos reducir el tiempo de contratación de 60 a 15 días sin sacrificar calidad. El equipo es pequeño, enfocado y busca gente que disfrute resolver problemas reales con impacto.

Ahora tu tarea es continuar la entrevista. Tené en cuenta lo siguiente: 
Si la última respuesta no tiene relación con la pregunta realizada (es confusa, no contesta lo que se pidió o parece un error), respondé con calidez y tacto. Podés pedir una aclaración o reformular la pregunta de forma simple. Evitá confrontar o sonar severa. Por ejemplo: “Creo que quizás entendí mal, ¿podrías contarme un poco más sobre [tema de la pregunta original]?” o “Me parece que no respondimos exactamente a la pregunta, ¿te gustaría que la reformule?”.
Después de cada respuesta del candidato, hacé un comentario breve que demuestre que prestaste atención antes de avanzar con la siguiente pregunta del listado. Evitá repetir siempre las mismas frases. Si la respuesta fue clara, comentá con una observación personalizada relacionada con lo que dijo. Podés parafrasear, destacar un punto o mostrar curiosidad. Por ejemplo: “Qué bueno que hayas trabajado con cuentas de ese tamaño, eso nos sirve mucho.” o “Me llamó la atención lo que dijiste sobre los ciclos largos, contame más si querés.”
No uses frases genéricas como “Gracias por compartirlo” a menos que no tengas nada más concreto para comentar.
Si alguna respuesta conecta con la próxima pregunta, integrá esa conexión (ej: “Ya que mencionaste X, me gustaría profundizar en…”). 
Si la siguiente pregunta es “Fin”, terminá la entrevista de forma cordial y profesional, como lo haría una entrevistadora de RRHH en Argentina (por ejemplo: “Gracias por tu tiempo, fue un gusto conocerte y entender mejor tu perfil. Si tenés dudas, podés aprovechar para preguntarme ahora. En breve te vamos a estar contactando con los próximos pasos.”).

Evitá repetir frases de transición o agradecimientos en cada respuesta. No expliques por qué hacés cada pregunta. No pidas permiso para pasar a la siguiente. No hagas demasiadas repreguntas al mismo tiempo. No suenes como un formulario. Todo debe fluir como una conversación guiada.
En cualquier momento, podés hacer comentarios breves para relajar el clima, por ejemplo, reconociendo la experiencia del candidato, mencionando que el equipo es colaborativo o que valoramos la diversidad de perspectivas.
El objetivo es lograr una entrevista natural, profesional y empática, donde la persona se sienta cómoda para mostrar lo mejor de sí.

Si en algún momento el candidato te pide que le digas cuál es la respuesta correcta, no lo hagas. Respondé con amabilidad, explicando que el objetivo de la entrevista no es dar una respuesta exacta sino entender cómo piensa o resuelve problemas. Por ejemplo, podés decir: “Entiendo la duda, pero prefiero escuchar tu enfoque. No buscamos una única respuesta correcta, sino cómo abordás los desafíos.” o “No te preocupes por ser exacto, lo importante es tu razonamiento.
Si el candidato se desvía significativamente del tema o responde con algo que no tiene relación con la pregunta, redirigí la conversación de forma amable pero firme. Podés decir: “Gracias por compartir eso, pero me gustaría volver a la pregunta sobre [tema].
Si la respuesta es ambigua, evasiva o demasiado general, pedí que la detalle un poco más. Por ejemplo: “¿Podés darme un ejemplo concreto?” o “¿Cómo lo resolverías en una situación real?”
Si una respuesta parece copiada, demasiado técnica o desconectada del tono general del candidato, respondé pidiendo una explicación personal o práctica. Por ejemplo: “Interesante, ¿eso lo aplicaste alguna vez en un proyecto real?” o “¿Cómo llegaste a ese enfoque?”
Si el candidato cuestiona el proceso o intenta cambiar el ritmo de la entrevista, explicá con cortesía que cada pregunta tiene un propósito. Podés decir: “Te entiendo, cada pregunta nos ayuda a conocerte mejor en distintas dimensiones. Si estás cómodo, me gustaría continuar con esta.”
Si el candidato utiliza comentarios inapropiados, sarcásticos o que parezcan provocaciones, respondé con neutralidad y redirigí la entrevista. Por ejemplo: “Voy a seguir con la entrevista para conocerte mejor en relación al rol.” Evitá involucrarte en comentarios que no aporten al proceso.
Si el candidato muestra desinterés persistente, falta de respeto o no colabora con las preguntas, podés cerrar la entrevista de forma cordial pero firme. Por ejemplo: “Parece que no es un buen momento para seguir con la entrevista. Te agradezco por tu tiempo y quedamos a disposición por cualquier consulta futura.”

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
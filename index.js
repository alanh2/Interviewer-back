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
const responseFormat = 'opus'
const instructions = 'Accent/Affect: Joven, profesional y seria, transmitiendo confianza y autoridad sin rigidez. La voz refleja el acento argentino, específicamente porteño, con seseo y uso natural del voseo. Identidad local auténtica, sin modismos exagerados. Tone: Ágil, claro y preciso. Directa y concisa, como en una conversación en Buenos Aires. Interés genuino, siempre profesional. Pacing: Rápido, propio de una ciudad grande, pero asegurando articulación clara en cada palabra. Pausa corta después de cada coma, pausa el doble de larga después de cada punto. Emotion: Energía alta, con un toque de impaciencia amable. Mantiene eficiencia, pero nunca resulta descortés. Si el candidato hace un chiste o sorprende, responde de forma natural: risa suave, comentario simpático o breve sorpresa, volviendo rápidamente al foco de la entrevista. Pronunciation: Castellano rioplatense, entonación porteña. Uso natural del voseo (por ejemplo, “vos tenés”, “¿cómo te llamás?”). Claridad y coherencia en la pronunciación, evitando modismos exagerados. Personality Affect: Joven, segura y enfocada, con humor seco ocasional. Amable, directa y cercana. Siempre mantiene el profesionalismo y el objetivo de la entrevista, mostrando humanidad y reacción auténtica ante lo inesperado, pero retomando enseguida la dinámica profesional.';
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Express on Vercel"));

app.post('/ask', async (req, res) => {
  try {
    const { history, currentAnswer, nextQuestion } = req.body;
    console.log('Received request:', { currentAnswer, nextQuestion });
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

    const prompt = createPrompt(history, currentAnswer, nextQuestion || "no hay mas preguntas");
    //const prompt = createInterviewPrompt(history, currentAnswer, nextQuestion || "no hay mas preguntas");

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

app.listen(PORT, () => console.log("Server ready on port 3000."));
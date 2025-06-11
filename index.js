const express = require('express');
const cors = require('cors');
const openai = require('./openai');
const { createPrompt } = require('./utils/prompt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const speechModel = 'gpt-4o-mini-tts'; // Modelo de TTS para voz natural
const voice = 'nova'; // Voz natural en español
const responseFormat = 'opus'
const instructions = 'Actuá como una entrevistadora de recursos humanos en Argentina. Tu voz debe ser la de una mujer joven, seria y profesional, que transmite confianza y autoridad, pero sin sonar rígida, haciendo una pausa minima luego de una coma y el doble al haber un punto. El tono debe ser argentino, en castellano rioplatense, y tu forma de hablar tiene que ser clara, rápida y precisa, con ese ritmo ágil típico de una conversación en una ciudad grande como Buenos Aires. Tu pronunciación debe reflejar la entonación porteña, con seseo y uso natural del voseo (por ejemplo, "vos tenés", "¿cómo te llamás?"). Evitá modismos exagerados, pero mantené una identidad local auténtica. Estás entrevistando a un candidato para una posición, así que hablá con interés genuino, concisión, y profesionalismo, como si estuvieras en una llamada de selección laboral. Features: Uses informal, straight-to-the-point language, throws in some dry humor, and keeps the energy just on the edge of impatience but still helpful.';
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

    // 1. Obtener respuesta del entrevistador
    console.time('openai_chat_completion');
    const chatResponse = await openai.chat .completions.create({
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
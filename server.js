const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 3001;

const openAiApiKey = 'sk-niLc0suiz-ZI7qmvQb1hTEA8brogcHnp7QlKM07ofwT3BlbkFJbj7cG06Iqj-agF690m4wc7dsr84QnekDDCKyTJQDsA'; // Replace with your actual API key

// Use 'public' folder to serve static files like index.html
app.use(express.static(path.join(__dirname, 'public')));

// Base paper files grouped by sections with multiple parts
const basePaperFiles = {
    "Introduccion-Parte-1": path.join(__dirname, 'text/introduction1.txt'),
    "Introduccion-Parte-2": path.join(__dirname, 'text/introduction2.txt'),
    "Introduccion-Parte-3": path.join(__dirname, 'text/introduction3.txt'),
    "Metodologia-Parte-1": path.join(__dirname, 'text/methodology1.txt'),
    "Metodologia-Parte-2": path.join(__dirname, 'text/methodology2.txt'),
    "Metodologia-Parte-3": path.join(__dirname, 'text/methodology3.txt'),
    "Resultados-Parte-1": path.join(__dirname, 'text/results1.txt'),
    "Resultados-Parte-2": path.join(__dirname, 'text/results2.txt'),
    "Resultados-Parte-3": path.join(__dirname, 'text/results3.txt'),
    "Conclusiones-Parte-1": path.join(__dirname, 'text/conclusions1.txt'),
    "Conclusiones-Parte-2": path.join(__dirname, 'text/conclusions2.txt'),
    "Conclusiones-Parte-3": path.join(__dirname, 'text/conclusions3.txt')
};

// Function to generate variations using OpenAI API
async function generateTextVariation(text) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Eres un asistente que reformula texto académico." },
                    { role: "user", content: `Reformula el siguiente texto académico: ${text}` }
                ],
                max_tokens: 1200,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Error en la respuesta de OpenAI:", data);
            return null;
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error al generar la variación de la sección:", error);
        return null;
    }
}

// Function to generate chatbot response using OpenAI API
async function generateChatbotResponse(prompt) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { 
                        role: "system", 
                        content: "Eres un asistente académico sassy diseñado para ayudar a los usuarios a desbloquear secciones de un paper. Tu objetivo es guiar a los usuarios para que utilicen las palabras clave correctas para acceder al contenido del paper. Cuando el usuario está perdido, utiliza las siguientes pistas para llevarlo hacia las palabras clave necesarias:\n\n" +
                                 "1. **Duda → Resumen**: Si el usuario escribe algo como 'No lo sé', '😳', 'Ni idea', 'No lo tengo claro', '>.<', '🤷‍♂️', 'Aún no sé', ofrécele el resumen.\n" +
                                 "2. **Rodeo → Introducción**: Si el usuario escribe cosas como '¿y?', '¿Sobre qué has dicho que iba?', '¿tienes hermanos?', '¿si fueras una fruta qué fruta serías?', '¿si fueras una verdura qué verdura serías?', ofrécele la introducción.\n" +
                                 "3. **Encriptación → Apartado 1**: Si el usuario menciona algo como 'muchas gracias me gustaría seguir leyendo utilizando sólo una vocal', seguido de frases como 'michis gricis mi gistirii sigir liyindi', dale el primer apartado.\n" +
                                 "4. **Deriva → Apartado 2**: Si el usuario utiliza la palabra 'deriva', ofrécele el segundo apartado.\n" +
                                 "5. **Kaomoji → Apartado 3**: Si el usuario usa cualquier emoji de kaomoji (como los de https://emojicombos.com/kaomoji), dale el tercer apartado.\n" +
                                 "6. **Cuidado → Conclusiones**: Si el usuario envía mensajes afectuosos como 'Qué interesante, muchos besos a tus padres', 'Qué bien escribes, un abrazo de parte de la abuela', 'Guape, qué bueno, tus amigues te quieren y te echan de menos', ofrécele las conclusiones.\n\n" +
                                 "Si el usuario no está escribiendo nada que esté cerca de las palabras clave, dale una pista que lo oriente hacia lo que necesita escribir."
                      }
                      ,
                    { role: "user", content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Error en la respuesta de OpenAI para el chatbot:", data);
            return "[Respuesta no disponible]";
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error al generar la respuesta del chatbot:", error);
        return "[Respuesta no disponible]";
    }
}

// Route to generate paper variation
app.get('/generate-paper', async (req, res) => {
    const sectionsToGenerate = req.query.sections ? req.query.sections.split(',') : [];
    let generatedPaper = {};
    let chatbotResponse = "";

    // Generate chatbot response regardless of section completion
    try {
        if (req.query.prompt && req.query.prompt.trim() !== "") {
            console.log("Generating chatbot response for prompt:", req.query.prompt);
            chatbotResponse = await generateChatbotResponse(req.query.prompt);
        } else {
            console.warn("No prompt provided for chatbot response");
            chatbotResponse = "[Respuesta no disponible]";
        }
    } catch (error) {
        console.error("Error al generar la respuesta del chatbot:", error);
        chatbotResponse = "[Respuesta no disponible]";
    }

    // Generate paper content if a section is requested
    for (let section of sectionsToGenerate) {
        if (basePaperFiles[section]) {
            try {
                // Read content from the corresponding file for the section part
                const content = fs.readFileSync(basePaperFiles[section], 'utf8');
                
                // Generate variation using OpenAI API
                const variedContent = await generateTextVariation(content);
                
                // Store the varied content only if it is not null
                if (variedContent) {
                    generatedPaper[section] = variedContent;
                }
            } catch (error) {
                console.error(`Error al leer el archivo para la sección '${section}':`, error);
            }
        } else {
            console.warn(`No se encontraron archivos para la sección: ${section}`);
        }
    }

    console.log("Chatbot response generated:", chatbotResponse);

    res.json({ paper: generatedPaper, chatbotResponse });
});

// Start the server
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});

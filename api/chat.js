/**
 * SignalForge - Vercel Serverless Function: Level 2 AI Tutor
 * Receives { question, context } and queries Gemini API if GEMINI_API_KEY is configured.
 * Never exposes API keys to client code.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Graceful fallback status so client uses Level 1 offline brain
    return res.status(503).json({ error: 'GEMINI_API_KEY environment variable not configured.' });
  }

  try {
    const { question, context } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'Missing question in request body.' });
    }

    const systemPrompt = `You are a patient, encouraging Data Communication laboratory tutor for second-year undergraduate engineering students.
Answer in at most 4 concise, clear sentences. Focus on physical communication concepts (ASCII, bits, XOR, CRC-8, Hamming(7,4), ASK/FSK/PSK, AWGN, correlators, BER, TDM/FDM, PCM, and LANs).
Current Application Context: ${JSON.stringify(context || {})}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nStudent Question: ${question}` }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.3
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!answer) {
      return res.status(500).json({ error: 'No response generated from Gemini API.' });
    }

    return res.status(200).json({ answer, source: 'gemini-ai' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}

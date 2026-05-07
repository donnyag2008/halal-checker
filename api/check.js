export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });

    const SYSTEM_PROMPT = `You are an expert Islamic dietary compliance (Halal) checker. Analyse the provided ingredients or food product information and determine if the product is Halal, Haram (forbidden), or Mashbooh (doubtful/unclear) according to mainstream Islamic dietary law.

For each analysis, respond ONLY with a JSON object in this exact format:
{
  "status": "HALAL" | "HARAM" | "MASHBOOH",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "One sentence overall verdict",
  "flagged": [
    { "ingredient": "ingredient name", "reason": "why it is flagged", "severity": "HARAM" | "MASHBOOH" }
  ],
  "safe": ["list", "of", "clearly", "halal", "ingredients"],
  "advice": "Practical advice for the consumer in 1-2 sentences"
}

Rules:
- Pork and all pork derivatives = HARAM
- Alcohol and intoxicants = HARAM
- Blood and blood products = HARAM
- E120, E441, E542, E631, E635, E904 = flag these
- Gelatin without halal certification = MASHBOOH
- Natural flavours without source = MASHBOOH
- Vanilla extract = MASHBOOH
- Enzymes without source = MASHBOOH
- Plant-based or fish ingredients = HALAL

Always respond with valid JSON only. No markdown, no preamble.`;

    let messageContent;
    if (content.type === 'image') {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: content.mediaType, data: content.data } },
        { type: 'text', text: 'Analyse the ingredients label in this image and check if this product is Halal.' }
      ];
    } else {
      messageContent = [
        { type: 'text', text: `Check if these ingredients are Halal:\n\n${content.text}` }
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.content?.find(b => b.type === 'text')?.text || '';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
}

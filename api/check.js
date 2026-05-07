module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });

    let messageContent;
    if (content.type === 'image') {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: content.mediaType, data: content.data } },
        { type: 'text', text: 'Analyse the ingredients label and check if this product is Halal according to Islamic dietary law. Respond only in JSON.' }
      ];
    } else {
      messageContent = [
        { type: 'text', text: `Check if these ingredients are Halal according to Islamic dietary law. Respond only in JSON with status (HALAL/HARAM/MASHBOOH), confidence (HIGH/MEDIUM/LOW), summary, flagged array, safe array, and advice.\n\n${content.text}` }
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

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { content } = JSON.parse(event.body);
    if (!content) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing content' }) };

    let messageContent;
    if (content.type === 'image') {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: content.mediaType, data: content.data } },
        { type: 'text', text: 'Analyse the ingredients label and check if this product is Halal. Respond only in JSON with: status (HALAL/HARAM/MASHBOOH), confidence (HIGH/MEDIUM/LOW), summary, flagged array with ingredient/reason/severity, safe array, and advice.' }
      ];
    } else {
      messageContent = [
        { type: 'text', text: `Check if these ingredients are Halal. Respond only in JSON with: status (HALAL/HARAM/MASHBOOH), confidence (HIGH/MEDIUM/LOW), summary, flagged array with ingredient/reason/severity, safe array, and advice.\n\n${content.text}` }
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
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    const data = await response.json();
    if (data.error) return { statusCode: 500, headers, body: JSON.stringify({ error: data.error.message }) };

    const raw = data.content?.find(b => b.type === 'text')?.text || '';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Analysis failed' }) };
  }
};

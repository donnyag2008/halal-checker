exports.handler = async function(event, context) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    var body = JSON.parse(event.body);
    var content = body.content;
    var lang = body.lang || 'en';

    if (!content) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Missing content' }) };
    }

    var systemPromptEN = 'You are an expert Islamic dietary compliance (Halal) checker. Analyse the provided ingredients or food product information and determine if the product is Halal, Haram (forbidden), or Mashbooh (doubtful/unclear) according to mainstream Islamic dietary law.\n\nRespond ONLY with a JSON object in this exact format:\n{\n  "status": "HALAL" | "HARAM" | "MASHBOOH",\n  "confidence": "HIGH" | "MEDIUM" | "LOW",\n  "summary": "One sentence overall verdict in English",\n  "flagged": [\n    { "ingredient": "ingredient name", "reason": "why it is flagged in English", "severity": "HARAM" | "MASHBOOH" }\n  ],\n  "safe": ["list", "of", "clearly", "halal", "ingredients"],\n  "advice": "Practical advice in English in 1-2 sentences"\n}\n\nRules:\n- Pork and all pork derivatives = HARAM\n- Alcohol and intoxicants = HARAM\n- Blood and blood products = HARAM\n- E120, E441, E542, E631, E635, E904 = flag these\n- Gelatin without halal certification = MASHBOOH\n- Natural flavours without source = MASHBOOH\n- Vanilla extract = MASHBOOH\n- Enzymes without source = MASHBOOH\n- Plant-based or fish ingredients = HALAL\n\nAlways respond with valid JSON only. No markdown, no preamble.';

    var systemPromptID = 'Anda adalah ahli pemeriksa kehalalan makanan berdasarkan syariat Islam. Analisa bahan-bahan makanan yang diberikan dan tentukan apakah produk tersebut Halal, Haram, atau Mashbooh (meragukan) berdasarkan hukum Islam arus utama.\n\nBerikan respons HANYA dalam format JSON berikut:\n{\n  "status": "HALAL" | "HARAM" | "MASHBOOH",\n  "confidence": "HIGH" | "MEDIUM" | "LOW",\n  "summary": "Satu kalimat kesimpulan dalam Bahasa Indonesia",\n  "flagged": [\n    { "ingredient": "nama bahan", "reason": "alasan dipertanyakan dalam Bahasa Indonesia", "severity": "HARAM" | "MASHBOOH" }\n  ],\n  "safe": ["daftar", "bahan", "yang", "halal"],\n  "advice": "Saran praktis dalam Bahasa Indonesia 1-2 kalimat"\n}\n\nAturan:\n- Babi dan semua turunannya = HARAM\n- Alkohol dan minuman memabukkan = HARAM\n- Darah dan produk darah = HARAM\n- E120, E441, E542, E631, E635, E904 = tandai sebagai mencurigakan\n- Gelatin tanpa sertifikasi halal = MASHBOOH\n- Perisa alami tanpa keterangan sumber = MASHBOOH\n- Ekstrak vanila = MASHBOOH\n- Enzim tanpa keterangan sumber = MASHBOOH\n- Bahan nabati atau ikan = HALAL\n\nSelalu berikan respons dalam JSON yang valid saja. Tidak ada markdown, tidak ada pembuka.';

    var systemPrompt = lang === 'id' ? systemPromptID : systemPromptEN;

    var userText = lang === 'id'
      ? 'Periksa apakah bahan-bahan ini halal menurut syariat Islam:'
      : 'Check if these ingredients are Halal according to Islamic dietary law:';

    var messageContent;
    if (content.type === 'image') {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: content.mediaType, data: content.data } },
        { type: 'text', text: lang === 'id'
          ? 'Analisa label bahan-bahan pada gambar ini dan periksa apakah produk ini halal menurut syariat Islam.'
          : 'Analyse the ingredients label in this image and check if this product is Halal according to Islamic dietary law.' }
      ];
    } else {
      messageContent = [
        { type: 'text', text: userText + '\n\n' + content.text }
      ];
    }

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    var data = await response.json();
    if (data.error) {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: data.error.message }) };
    }

    var raw = data.content && data.content.find(function(b) { return b.type === 'text'; });
    var text = raw ? raw.text : '';
    var result = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { statusCode: 200, headers: headers, body: JSON.stringify(result) };

  } catch (err) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message || 'Analysis failed' }) };
  }
};

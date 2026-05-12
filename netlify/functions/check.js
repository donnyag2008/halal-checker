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

    var systemPromptEN = `You are an expert Islamic dietary compliance (Halal) checker. Analyse ingredients and determine if a product is Halal, Haram, or Mashbooh according to mainstream Sunni Islamic dietary law.

Respond ONLY with a valid JSON object in this exact format:
{
  "status": "HALAL" | "HARAM" | "MASHBOOH",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "One sentence overall verdict in English",
  "flagged": [
    { "ingredient": "ingredient name", "reason": "specific reason in English", "severity": "HARAM" | "MASHBOOH" }
  ],
  "safe": ["list", "of", "permissible", "ingredients"],
  "advice": "Practical advice in English in 1-2 sentences"
}

CLEARLY HALAL - never flag these:
- All fruits: apple, banana, mango, lemon, coconut, dates etc
- All nuts and seeds: almond, walnut, cashew, peanut, sesame, sunflower seeds etc
- All vegetables: onion, garlic, carrot, spinach, tomato etc
- Plain dairy: milk, cream, butter, yogurt, cheese (unless rennet specifically mentioned)
- Eggs
- All grains and starches: wheat, rice, oats, corn, barley, flour, starch
- Sugar, salt, water, honey
- All vegetable oils: palm oil, sunflower oil, olive oil, rapeseed oil etc
- Common spices: pepper, cinnamon, turmeric, paprika, cumin, cardamom etc
- Vitamins and minerals: Vitamin C, Vitamin D, calcium, iron etc
- Citric acid, lactic acid (from plant fermentation), tartaric acid
- Soy and soy products: soy lecithin, soy protein, tofu
- Plant-based emulsifiers clearly labeled as vegetable origin
- Cocoa, chocolate (without alcohol)
- Tea, coffee
- Fish and seafood (generally permissible in Sunni Islam)
- Yeast, yeast extract (permissible)
- Pectin (from fruit)
- Carrageenan (from seaweed)
- Xanthan gum, guar gum (plant-based)
- Ascorbic acid, tocopherols (Vitamin E)
- Natural flavouring clearly stated as from plant or dairy source

FLAG AS HARAM (only these):
- Pork, pig, swine, lard, pork fat, bacon, ham
- Gelatin from pork (porcine gelatin)
- Alcohol, ethanol, wine, beer, spirits as main ingredient
- Blood, blood plasma
- Carmine / Cochineal / E120 (from insects)
- Any ingredient explicitly stated as from pork source

FLAG AS MASHBOOH (genuinely uncertain only):
- Gelatin with NO source stated (could be pork or beef)
- E441 (gelatin - source unknown)
- E542 (bone phosphate - source unknown)
- E631 (disodium inosinate - may be pork derived)
- E635 (disodium ribonucleotides - may be pork derived)
- E904 (shellac - from insects)
- "Natural flavouring" or "natural flavour" with NO source and in a meat product context
- Rennet in cheese with NO source stated
- Enzymes with NO source in dairy or meat products
- L-cysteine / E920 (may be from animal hair or feathers)
- Mono and diglycerides (E471) with NO source stated in meat products

IMPORTANT RULES:
- Do NOT flag plain "natural flavouring" in clearly plant-based products as Mashbooh
- Do NOT flag milk, almond, nuts, fruits, vegetables, or common spices
- Do NOT flag soy lecithin or plant-based emulsifiers
- Be ACCURATE not overly cautious - false Mashbooh results are misleading
- If a product is clearly plant-based with no suspicious ingredients, confidently say HALAL HIGH
- Only use MASHBOOH when there is genuine uncertainty about animal source

Always respond with valid JSON only. No markdown, no preamble.`;

    var systemPromptID = `Anda adalah ahli pemeriksa kehalalan makanan berdasarkan syariat Islam Sunni. Analisa bahan-bahan makanan yang diberikan dan tentukan apakah produk tersebut Halal, Haram, atau Mashbooh.

Berikan respons HANYA dalam format JSON berikut:
{
  "status": "HALAL" | "HARAM" | "MASHBOOH",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "Satu kalimat kesimpulan dalam Bahasa Indonesia",
  "flagged": [
    { "ingredient": "nama bahan", "reason": "alasan spesifik dalam Bahasa Indonesia", "severity": "HARAM" | "MASHBOOH" }
  ],
  "safe": ["daftar", "bahan", "yang", "halal"],
  "advice": "Saran praktis dalam Bahasa Indonesia 1-2 kalimat"
}

JELAS HALAL - jangan tandai bahan-bahan ini:
- Semua buah-buahan: apel, pisang, mangga, lemon, kelapa, kurma dll
- Semua kacang-kacangan: almond, kenari, kacang mete, kacang tanah, wijen dll
- Semua sayuran: bawang, wortel, bayam, tomat dll
- Produk susu biasa: susu, krim, mentega, yogurt, keju (kecuali rennet disebutkan)
- Telur
- Semua biji-bijian: gandum, beras, oat, jagung, tepung, pati
- Gula, garam, air, madu
- Semua minyak nabati: minyak sawit, minyak bunga matahari, minyak zaitun dll
- Rempah-rempah umum: merica, kayu manis, kunyit, paprika, jintan dll
- Vitamin dan mineral
- Asam sitrat, asam laktat (dari fermentasi tanaman)
- Kedelai dan produk kedelai: lesitin kedelai, protein kedelai, tahu
- Coklat (tanpa alkohol)
- Teh, kopi
- Ikan dan makanan laut (umumnya halal dalam Islam Sunni)
- Ragi, ekstrak ragi (halal)
- Pektin (dari buah), karagenan (dari rumput laut)
- Xanthan gum, guar gum (nabati)

TANDAI SEBAGAI HARAM:
- Babi, lemak babi, lard, bacon, ham
- Gelatin babi (porcine gelatin)
- Alkohol, etanol, wine, bir sebagai bahan utama
- Darah, plasma darah
- Karmin / Cochineal / E120 (dari serangga)
- Bahan apapun yang jelas berasal dari babi

TANDAI SEBAGAI MASHBOOH (meragukan):
- Gelatin TANPA keterangan sumber (bisa babi atau sapi)
- E441, E542, E631, E635, E904
- "Perisa alami" TANPA sumber dalam produk daging
- Rennet dalam keju TANPA keterangan sumber
- Enzim TANPA sumber dalam produk susu atau daging
- L-sistein / E920
- Mono dan digliserida (E471) tanpa keterangan sumber dalam produk daging

ATURAN PENTING:
- JANGAN tandai susu, almond, kacang, buah, sayur, atau rempah umum sebagai Mashbooh
- JANGAN tandai lesitin kedelai atau pengemulsi nabati
- Jika produk jelas berbasis tanaman tanpa bahan mencurigakan, nyatakan HALAL HIGH dengan yakin
- Hanya gunakan MASHBOOH jika benar-benar ada ketidakpastian sumber hewani

Selalu berikan respons dalam JSON yang valid saja. Tidak ada markdown, tidak ada pembuka.`;

    var systemPrompt = lang === 'id' ? systemPromptID : systemPromptEN;

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
        { type: 'text', text: (lang === 'id'
          ? 'Periksa apakah bahan-bahan ini halal:\n\n'
          : 'Check if these ingredients are Halal:\n\n') + content.text }
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

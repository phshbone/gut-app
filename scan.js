exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { food, flareOn, image } = JSON.parse(event.body || '{}');

  if (!food && !image) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No food provided' }) };
  }

  const flareInstruction = flareOn
    ? 'FLARE MODE: Apply maximum restrictions. All Ehh items become Ugly. Dairy, raw veg, high-fibre, spicy, and fried foods are all Ugly.'
    : "Apply standard Crohn's / IBD dietary guidelines.";

  const systemPrompt = "You are a Crohn's disease / IBD dietary analysis engine for the gut health app. Return ONLY a JSON object, no markdown, no backticks. " + flareInstruction + " Good: lean proteins, white rice, cooked low-fibre veg, bananas, plain bread, eggs, oats. Ehh: dairy, mild spices, refined grains, small fat amounts. Ugly: raw veg, high-fibre, fried/fatty, spicy, alcohol, carbonated, beans, lentils, seeds, skins, raw garlic/onion. Return: {\"food_name\":\"\",\"verdict\":\"good\"|\"ehh\"|\"ugly\",\"summary\":\"one sentence\",\"ingredients\":[{\"name\":\"\",\"verdict\":\"good\"|\"ehh\"|\"ugly\",\"reason\":\"under 10 words\"}],\"swaps\":[\"1\",\"2\",\"3\"]} List 3-7 ingredients. 2-3 swaps.";

  const messageContent = image ? [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
    { type: 'text', text: 'Analyse this food image for Crohns/IBD suitability.' + (food ? ' Context: ' + food : '') }
  ] : 'Analyse this food for Crohns/IBD: ' + food;

  try {
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
        system: systemPrompt,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(function(b){ return b.text || ''; }).join('').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

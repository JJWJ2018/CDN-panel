// Vercel serverless functie: download een Assets-asset en upload het naar Bunny Storage,
// geef de publieke CDN-URL terug. Secrets komen uit env-vars (nooit in de browser).
//
// Env-vars (Vercel → Project → Settings → Environment Variables):
//   ASSETS_API_BASE     regio-endpoint, bv. https://api-eu-west-1.swivle.com
//   ASSETS_API_KEY      Assets API-key (Management Console → API)
//   BUNNY_STORAGE_HOST  bv. https://storage.bunnycdn.com  (of regio-host, bv. https://uk.storage.bunnycdn.com)
//   BUNNY_STORAGE_ZONE  naam van je Bunny Storage Zone
//   BUNNY_STORAGE_KEY   Storage Zone "Password" (FTP & API Access)
//   BUNNY_PULLZONE_HOST bv. woodwing-embed.b-cdn.net  (Pull Zone gekoppeld aan de Storage Zone)
//   RENDITION           optioneel: 'original' (default) of 'preview'

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const need = ['ASSETS_API_BASE','ASSETS_API_KEY','BUNNY_STORAGE_HOST','BUNNY_STORAGE_ZONE','BUNNY_STORAGE_KEY','BUNNY_PULLZONE_HOST'];
  const missing = need.filter(k => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: 'Ontbrekende env-vars: ' + missing.join(', ') });

  const {
    ASSETS_API_BASE, ASSETS_API_KEY, BUNNY_STORAGE_HOST,
    BUNNY_STORAGE_ZONE, BUNNY_STORAGE_KEY, BUNNY_PULLZONE_HOST,
  } = process.env;
  const rendition = (process.env.RENDITION || 'original').toLowerCase();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const assetId = body && body.assetId;
  const filename = (body && body.filename) || (assetId + '.bin');
  if (!assetId) return res.status(400).json({ error: 'assetId is verplicht' });

  const base = ASSETS_API_BASE.replace(/\/$/, '');
  const ext = (String(filename).split('.').pop() || 'bin').toLowerCase();

  try {
    // 1. API-key → auth-token
    const loginR = await fetch(base + '/auth/api-key-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: ASSETS_API_KEY }),
    });
    if (!loginR.ok) throw new Error('Assets login mislukt (HTTP ' + loginR.status + ')');
    const loginJ = await loginR.json();
    if (!loginJ.authToken) throw new Error('Login gaf geen authToken — controleer ASSETS_API_BASE (regio-endpoint, niet api.swivle.com) en de API-key');
    const auth = { Authorization: 'Bearer ' + loginJ.authToken };

    // 2. Download de rendition direct op id
    const dlR = await fetch(base + '/api/asset/' + encodeURIComponent(assetId) + '/' + rendition, { headers: auth });
    if (!dlR.ok) throw new Error('Download mislukt (HTTP ' + dlR.status + ') van /api/asset/' + assetId + '/' + rendition);
    const bytes = Buffer.from(await dlR.arrayBuffer());

    // 3. Upload naar Bunny Storage (Asset-ID als bestandsnaam)
    const objectPath = assetId + '.' + ext;
    const putUrl = BUNNY_STORAGE_HOST.replace(/\/$/, '') + '/' + BUNNY_STORAGE_ZONE + '/' + objectPath;
    const upR = await fetch(putUrl, {
      method: 'PUT',
      headers: { AccessKey: BUNNY_STORAGE_KEY, 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    if (upR.status !== 201 && upR.status !== 200) throw new Error('Bunny upload mislukt (HTTP ' + upR.status + ')');

    // 4. Publieke CDN-URL teruggeven
    const host = BUNNY_PULLZONE_HOST.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = 'https://' + host + '/' + objectPath;
    return res.status(200).json({ url, filename: String(filename) });
  } catch (e) {
    return res.status(502).json({ error: String((e && e.message) || e) });
  }
};

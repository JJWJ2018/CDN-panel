// Vercel serverless functie: upload een Assets-asset naar Bunny Storage en geef de
// publieke CDN-URL terug. Secrets komen uit env-vars (nooit in de browser).
//
// Vereiste env-vars (zet deze in Vercel → Project → Settings → Environment Variables):
//   ASSETS_API_BASE     bv. https://api-eu-west-1.swivle.com   (API-endpoint van je regio)
//   ASSETS_API_KEY      Assets API-key (Management Console → API)
//   BUNNY_STORAGE_HOST  bv. https://storage.bunnycdn.com  (of regio-host: https://uk.storage.bunnycdn.com)
//   BUNNY_STORAGE_ZONE  naam van je Bunny Storage Zone
//   BUNNY_STORAGE_KEY   Storage Zone "Password" (FTP & API Access)
//   BUNNY_PULLZONE_HOST bv. woodwing-embed.b-cdn.net  (Pull Zone gekoppeld aan de Storage Zone)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const need = ['ASSETS_API_BASE','ASSETS_API_KEY','BUNNY_STORAGE_HOST','BUNNY_STORAGE_ZONE','BUNNY_STORAGE_KEY','BUNNY_PULLZONE_HOST'];
  const missing = need.filter(k => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: 'Ontbrekende env-vars: ' + missing.join(', ') });

  const {
    ASSETS_API_BASE, ASSETS_API_KEY, BUNNY_STORAGE_HOST,
    BUNNY_STORAGE_ZONE, BUNNY_STORAGE_KEY, BUNNY_PULLZONE_HOST,
  } = process.env;

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const assetId = body && body.assetId;
  if (!assetId) return res.status(400).json({ error: 'assetId is verplicht' });

  const base = ASSETS_API_BASE.replace(/\/$/, '');

  try {
    // 1. API-key → auth-token
    const loginR = await fetch(base + '/auth/api-key-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: ASSETS_API_KEY }),
    });
    if (!loginR.ok) throw new Error('Assets login mislukt (HTTP ' + loginR.status + ')');
    const { authToken } = await loginR.json();
    const auth = { Authorization: 'Bearer ' + authToken };

    // 2. Zoek het asset op id → haal download-URL + bestandsnaam
    const q = encodeURIComponent('id:' + assetId);
    const searchR = await fetch(base + '/api/asset/search?q=' + q + '&num=1', { headers: auth });
    if (!searchR.ok) throw new Error('Assets search mislukt (HTTP ' + searchR.status + ')');
    const searchJ = await searchR.json();
    const hit = searchJ.hits && searchJ.hits[0];
    if (!hit) throw new Error('Asset niet gevonden: ' + assetId);

    const md = hit.metadata || {};
    const filename = md.filename || (assetId + '.bin');
    const ext = (filename.split('.').pop() || 'bin').toLowerCase();
    const rel = hit.originalUrl || hit.previewUrl || md.originalUrl;
    if (!rel) throw new Error('Geen downloadbare rendition gevonden voor dit asset');
    const downloadUrl = /^https?:\/\//.test(rel) ? rel : base + (rel.startsWith('/') ? '' : '/') + rel;

    // 3. Download de bytes
    const fileR = await fetch(downloadUrl, { headers: auth });
    if (!fileR.ok) throw new Error('Download mislukt (HTTP ' + fileR.status + ')');
    const bytes = Buffer.from(await fileR.arrayBuffer());

    // 4. Upload naar Bunny Storage (Asset-ID als bestandsnaam)
    const objectPath = assetId + '.' + ext;
    const putUrl = BUNNY_STORAGE_HOST.replace(/\/$/, '') + '/' + BUNNY_STORAGE_ZONE + '/' + objectPath;
    const upR = await fetch(putUrl, {
      method: 'PUT',
      headers: { AccessKey: BUNNY_STORAGE_KEY, 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    if (upR.status !== 201 && upR.status !== 200) throw new Error('Bunny upload mislukt (HTTP ' + upR.status + ')');

    // 5. Publieke CDN-URL teruggeven
    const host = BUNNY_PULLZONE_HOST.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = 'https://' + host + '/' + objectPath;
    return res.status(200).json({ url, filename });
  } catch (e) {
    return res.status(502).json({ error: String((e && e.message) || e) });
  }
};

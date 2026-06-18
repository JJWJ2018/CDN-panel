# Embed-link plugin (Bunny CDN)

Assets 10 panel-plugin: selecteer een asset → **Publiceer als embed-link** → toont de
publieke Bunny CDN-URL + QR-code + kopieer/HTML-snippet. Frontend op de bestaande
Bunny-integratie (Tom Pijsel) via de CDN-metadatavelden.

## Hoe het werkt
1. Plugin leest de selectie via `@woodwing/a10-client-sdk` (`getSelection`).
2. "Publiceer" → zet `cf_cdnPublish = true` via `updateBulkById`.
3. De Bunny-integratie (Workato) uploadt de rendition en vult `cf_cdnUrl` + `cf_cdnStatus`.
4. Plugin pollt op `cf_cdnUrl` (via `search` op asset-id) en toont zodra beschikbaar:
   URL, QR-code, kopieer-knop, HTML-snippet, "Open", "QR opslaan".
5. "Verwijder embed-link" → `cf_cdnPublish = false`.

Veldnamen staan in `config.js` (`cf_cdnPublish`, `cf_cdnUrl`, `cf_cdnStatus`).

## Deploy
Zelfde route als de andere plugins: bestanden naar GitHub → Vercel → de Vercel-URL in
Management Console → Panel plug-ins → `+` (Name "Embed link", URL = Vercel-URL,
Icon = `icon.png`).

## Afhankelijkheid (belangrijk)
De plugin zet/leest alleen metadata. De daadwerkelijke upload naar Bunny + het vullen van
`cf_cdnUrl` doet de **Bunny-integratie (Workato)**. Die moet draaien op deze Assets-10-
omgeving/tenant, anders blijft `cf_cdnUrl` leeg en toont de plugin na de timeout:
"Nog geen CDN-URL ontvangen…". Zonder die motor is een dunne `api/publish`-functie nodig
die de upload zelf doet (zie scoping-doc, optie "mini-motor").

## Te verifiëren bij de eerste test in Assets
- Of de upload-integratie op deze omgeving draait (anders blijft het op "publiceren…").
- De exacte vorm van `client.search(...)` in deze omgeving — de poll gebruikt
  `{ q: 'id:<id>' }` en leest `hits[0].metadata`; mogelijk moet dat iets anders.
- Of `cf_cdnPublish` een boolean `true` verwacht of een string.
(Net als bij de location panel verwachten we hier 1 testronde-finetuning.)

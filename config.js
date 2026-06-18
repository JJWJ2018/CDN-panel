// Configuratie voor de Embed-link (Bunny CDN) panel-plugin.
window.PLUGIN_CONFIG = {
  // Interne metadata-veldnamen (door Jouke aangemaakt op Assets 10).
  CDN_PUBLISH_FIELD: 'cf_cdnPublish', // boolean trigger
  CDN_URL_FIELD: 'cf_cdnUrl',         // door de integratie ingevulde CDN-URL
  CDN_STATUS_FIELD: 'cf_cdnStatus',   // pending / delivered / failed / deleted

  // Accentkleur van de plugin. Zet op de branding-highlight van je tenant indien gewenst.
  // (Demo-tenant ww-dam-demo heeft highlight = #000000; default hier = WoodWing-blauw.)
  BRAND_COLOR: '#0396e0',

  // Serverless upload-motor (zelfde Vercel-deployment).
  API_PUBLISH_ENDPOINT: '/api/publish',

  // Fallback-polling (alleen gebruikt als een externe motor cf_cdnUrl vult).
  POLL_INTERVAL_MS: 3000,
  POLL_TIMEOUT_MS: 90000,
};

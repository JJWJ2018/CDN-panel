// Configuratie voor de Embed-link (Bunny CDN) panel-plugin.
window.PLUGIN_CONFIG = {
  // Interne metadata-veldnamen (door Jouke aangemaakt op Assets 10).
  CDN_PUBLISH_FIELD: 'cf_cdnPublish', // boolean trigger
  CDN_URL_FIELD: 'cf_cdnUrl',         // door de integratie ingevulde CDN-URL
  CDN_STATUS_FIELD: 'cf_cdnStatus',   // pending / delivered / failed / deleted

  // Pollen op de CDN-URL nadat 'Publiceer' is gezet (de upload loopt async).
  POLL_INTERVAL_MS: 3000,
  POLL_TIMEOUT_MS: 90000,
};

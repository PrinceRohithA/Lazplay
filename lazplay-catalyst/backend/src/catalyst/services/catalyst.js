import { config } from '../config.js';

let catalystSdk = null;

export async function getCatalystApp(req) {
  if (config.mockCatalyst) return null;
  if (!catalystSdk) {
    const imported = await import('zcatalyst-sdk-node');
    catalystSdk = imported.default || imported;
  }
  return catalystSdk.initialize(req);
}

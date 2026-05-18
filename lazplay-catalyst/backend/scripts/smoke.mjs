const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:2000/api/v1';

const response = await fetch(`${baseUrl}/health`);
const body = await response.json();

if (!response.ok || body?.data?.status !== 'ok') {
  console.error(body);
  process.exit(1);
}

console.log(`Smoke OK: ${body.data.service} ${body.data.version}`);

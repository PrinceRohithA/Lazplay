const DEFAULT_API = process.env.LAZPLAY_API_URL || 'https://play.lazplay.tech/api/v1';

export class LazPlayApi {
  constructor(token, baseUrl = DEFAULT_API) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async request(method, path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = json.error || json;
      throw new Error(err.message || `API ${res.status}: ${path}`);
    }
    return json.data ?? json;
  }

  checkChunks(buildId, hashes) {
    return this.request('POST', `/developer/builds/${buildId}/chunks/check`, { hashes });
  }

  getChunkUploadUrl(buildId, hash, sizeBytes) {
    return this.request('POST', `/developer/builds/${buildId}/chunks/upload-url`, {
      hash,
      sizeBytes: String(sizeBytes)
    });
  }

  completeChunk(buildId, hash, sizeBytes) {
    return this.request('POST', `/developer/builds/${buildId}/chunks/complete`, {
      hash,
      sizeBytes: String(sizeBytes)
    });
  }

  publishManifest(buildId, manifest, version) {
    return this.request('POST', `/developer/builds/${buildId}/manifest`, { manifest, version });
  }

  async uploadChunkToUrl(uploadUrl, data) {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: data
    });
    if (!res.ok) {
      throw new Error(`Chunk upload failed: ${res.status}`);
    }
  }
}

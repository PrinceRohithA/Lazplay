export async function warmGameFileCache(downloadUrl) {
  try {
    // This mimics a CDN edge warm-up by forcing a tiny ranged fetch.
    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Range: "bytes=0-0"
      }
    });

    return {
      ok: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown warm-up error"
    };
  }
}

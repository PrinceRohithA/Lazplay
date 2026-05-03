export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = Number(error.statusCode) || 500;

  if (error?.name === "MulterError") {
    statusCode = 400;
  }

  if (typeof error?.message === "string" && error.message.toLowerCase().includes("only .zip")) {
    statusCode = 400;
  }

  if (statusCode >= 500) {
    console.error("Unhandled server error", error);
  }

  res.status(statusCode).json({
    error: error.message || "Internal Server Error"
  });
}

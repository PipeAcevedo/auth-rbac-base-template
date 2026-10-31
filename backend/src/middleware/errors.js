function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : 'An unexpected server error occurred.'
  });
}

module.exports = { notFound, errorHandler };

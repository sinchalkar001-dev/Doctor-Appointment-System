/** Forward rejected promises from async route handlers to Express's error handler. */
module.exports = function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

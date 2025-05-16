/**
 * Generalized class to send error response to the client
 */
class AppError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${this.statusCode}`.startsWith("4") ? "fail" : "error";
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export default AppError;
  
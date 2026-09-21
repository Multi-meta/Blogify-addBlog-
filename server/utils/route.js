// Small helpers shared by the subscription / travel routes.

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Wraps an async handler: thrown HttpErrors become their status, Mongoose
// validation problems become 400, anything else is a generic 500.
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ success: false, error: error.message, ...error.extra });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error(error);
    return res.status(500).json({ success: false, error: "Something went wrong." });
  }
};

// Trimmed string (or "" for anything that isn't a string), capped at `max` chars
const str = (value, max = 5000) => (typeof value === "string" ? value.trim().slice(0, max) : "");

module.exports = { HttpError, handle, str };

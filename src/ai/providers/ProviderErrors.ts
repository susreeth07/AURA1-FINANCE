export class InvalidApiKeyError extends Error {
  constructor(message = "Invalid or missing API key.") {
    super(message);
    this.name = "InvalidApiKeyError";
  }
}

export class QuotaExceededError extends Error {
  constructor(message = "API Quota exceeded.") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class RateLimitError extends Error {
  constructor(message = "Rate limit reached. Try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends Error {
  constructor(message = "Request execution timed out.") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class ProviderUnavailableError extends Error {
  constructor(message = "LLM provider is currently unavailable.") {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class StreamingError extends Error {
  constructor(message = "Error during stream chunk generation.") {
    super(message);
    this.name = "StreamingError";
  }
}

export class ProviderConfigurationError extends Error {
  constructor(message = "Invalid provider configuration.") {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

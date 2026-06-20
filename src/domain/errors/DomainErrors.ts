export class DomainError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidBudgetError extends DomainError {
  constructor(message: string = "The budget limit must be greater than zero and have matching currency.") {
    super(message, "INVALID_BUDGET");
  }
}

export class InsufficientSavingsError extends DomainError {
  constructor(message: string = "Insufficient savings to perform the requested allocation or withdrawal.") {
    super(message, "INSUFFICIENT_SAVINGS");
  }
}

export class NegativeCashFlowError extends DomainError {
  constructor(message: string = "Operation results in a negative cash flow trend.") {
    super(message, "NEGATIVE_CASH_FLOW");
  }
}

export class ForecastUnavailableError extends DomainError {
  constructor(message: string = "Insufficient historical data to generate a forecast.") {
    super(message, "FORECAST_UNAVAILABLE");
  }
}

export class ValidationError extends DomainError {
  readonly fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

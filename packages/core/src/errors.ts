/** Base class for action-layer errors. `status` maps cleanly to HTTP in the API. */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends ActionError {
  constructor(what: string) {
    super(`${what} not found`, 'not_found', 404);
  }
}

export class ValidationError extends ActionError {
  constructor(message: string) {
    super(message, 'validation', 400);
  }
}

/** Raised when a `contains` edge would create a cycle in the containment graph. */
export class CycleError extends ActionError {
  constructor() {
    super('edge would create a containment cycle', 'contains_cycle', 409);
  }
}

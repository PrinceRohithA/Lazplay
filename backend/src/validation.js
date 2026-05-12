export class ValidationError extends Error {
  constructor(details, message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

const hasValue = (value) =>
  value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

export const validationFailure = (details, message = 'Validation failed') => {
  throw new ValidationError(details, message);
};

const addValidationError = (errors, field, message) => {
  errors.push({ field, message });
};

const withDefault = (value, defaultValue) => {
  if (value !== undefined) return value;
  return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
};

export const validators = {
  string: ({
    required = true,
    trim = true,
    min = 1,
    max = 500,
    lower = false,
    upper = false,
    allowBlank = false,
    pattern,
    oneOf,
    defaultValue
  } = {}) => (value, field, _body, errors) => {
    const missing = value === undefined || value === null || (!allowBlank && typeof value === 'string' && value.trim() === '');
    if (missing) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    if (typeof value !== 'string') {
      addValidationError(errors, field, `${field} must be a string`);
      return undefined;
    }
    let next = trim ? value.trim() : value;
    if (lower) next = next.toLowerCase();
    if (upper) next = next.toUpperCase();
    if (next.length < min) addValidationError(errors, field, `${field} must be at least ${min} characters`);
    if (next.length > max) addValidationError(errors, field, `${field} must be at most ${max} characters`);
    if (pattern && !pattern.test(next)) addValidationError(errors, field, `${field} is invalid`);
    if (oneOf && !oneOf.includes(next)) {
      addValidationError(errors, field, `${field} must be one of: ${oneOf.join(', ')}`);
    }
    return next;
  },

  email: (options = {}) => (value, field, body, errors) => {
    const email = validators.string({ max: 254, lower: true, ...options })(value, field, body, errors);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addValidationError(errors, field, `${field} must be a valid email`);
    }
    return email;
  },

  password: ({ min = 8, max = 128, ...options } = {}) =>
    validators.string({ min, max, trim: false, ...options }),

  id: (options = {}) =>
    validators.string({ min: 1, max: 160, pattern: /^[A-Za-z0-9:_-]+$/, ...options }),

  token: (options = {}) =>
    validators.string({ min: 10, max: 4096, trim: true, ...options }),

  url: (options = {}) => (value, field, body, errors) => {
    const url = validators.string({ max: 2048, ...options })(value, field, body, errors);
    if (!url) return url;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        addValidationError(errors, field, `${field} must be an http or https URL`);
      }
    } catch {
      addValidationError(errors, field, `${field} must be a valid URL`);
    }
    return url;
  },

  int: ({ required = true, min, max, defaultValue } = {}) => (value, field, _body, errors) => {
    if (!hasValue(value)) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(number)) {
      addValidationError(errors, field, `${field} must be an integer`);
      return undefined;
    }
    if (min !== undefined && number < min) addValidationError(errors, field, `${field} must be at least ${min}`);
    if (max !== undefined && number > max) addValidationError(errors, field, `${field} must be at most ${max}`);
    return number;
  },

  bigint: ({ required = true, min = 0n, max, defaultValue } = {}) => (value, field, _body, errors) => {
    if (!hasValue(value)) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    try {
      const parsed = BigInt(value);
      if (parsed < min) addValidationError(errors, field, `${field} must be at least ${min.toString()}`);
      if (max !== undefined && parsed > max) addValidationError(errors, field, `${field} must be at most ${max.toString()}`);
      return parsed;
    } catch {
      addValidationError(errors, field, `${field} must be an integer`);
      return undefined;
    }
  },

  boolean: ({ required = false, defaultValue } = {}) => (value, field, _body, errors) => {
    if (!hasValue(value)) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    addValidationError(errors, field, `${field} must be a boolean`);
    return undefined;
  },

  stringArray: ({
    required = false,
    minItems = 0,
    maxItems = 50,
    maxLength = 80,
    defaultValue,
    upper = false
  } = {}) => (value, field, _body, errors) => {
    if (!hasValue(value)) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    const values = Array.isArray(value)
      ? value
      : (typeof value === 'string' ? value.split(',') : null);
    if (!values) {
      addValidationError(errors, field, `${field} must be an array of strings`);
      return undefined;
    }
    const normalized = values
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item !== '');
    if (normalized.some((item) => typeof item !== 'string')) {
      addValidationError(errors, field, `${field} must contain only strings`);
      return undefined;
    }
    if (normalized.length < minItems) addValidationError(errors, field, `${field} must include at least ${minItems} item(s)`);
    if (normalized.length > maxItems) addValidationError(errors, field, `${field} must include at most ${maxItems} item(s)`);
    if (normalized.some((item) => item.length > maxLength)) {
      addValidationError(errors, field, `${field} items must be at most ${maxLength} characters`);
    }
    return upper ? normalized.map((item) => item.toUpperCase()) : normalized;
  },

  object: ({ required = true, defaultValue } = {}) => (value, field, _body, errors) => {
    if (!hasValue(value)) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      addValidationError(errors, field, `${field} must be an object`);
      return undefined;
    }
    return value;
  },

  array: ({ required = true, minItems = 0, maxItems = 100, defaultValue } = {}) => (value, field, _body, errors) => {
    if (!hasValue(value)) {
      if (required) addValidationError(errors, field, `${field} is required`);
      return withDefault(undefined, defaultValue);
    }
    if (!Array.isArray(value)) {
      addValidationError(errors, field, `${field} must be an array`);
      return undefined;
    }
    if (value.length < minItems) addValidationError(errors, field, `${field} must include at least ${minItems} item(s)`);
    if (value.length > maxItems) addValidationError(errors, field, `${field} must include at most ${maxItems} item(s)`);
    return value;
  },

  enum: (values, options = {}) =>
    validators.string({ oneOf: values, upper: true, ...options }),

  fileName: (options = {}) => (value, field, body, errors) => {
    const fileName = validators.string({ max: 255, ...options })(value, field, body, errors);
    if (fileName && (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..'))) {
      addValidationError(errors, field, `${field} must be a file name, not a path`);
    }
    return fileName;
  },

  objectKey: (options = {}) => (value, field, body, errors) => {
    const objectKey = validators.string({ max: 1024, ...options })(value, field, body, errors);
    if (objectKey && (objectKey.startsWith('/') || objectKey.includes('..') || objectKey.includes('\\'))) {
      addValidationError(errors, field, `${field} is not a safe object key`);
    }
    return objectKey;
  }
};

export const validateBody = (body, schema, { atLeastOne } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    validationFailure([{ field: 'body', message: 'Request body must be a JSON object' }]);
  }
  const errors = [];
  const output = {};
  for (const [field, validator] of Object.entries(schema)) {
    const value = validator(body[field], field, body, errors);
    if (value !== undefined) output[field] = value;
  }
  if (atLeastOne && atLeastOne.every((field) => output[field] === undefined)) {
    addValidationError(errors, atLeastOne.join('|'), `At least one of ${atLeastOne.join(', ')} is required`);
  }
  if (errors.length > 0) validationFailure(errors);
  return output;
};

export const validateQueryInt = (query, field, options = {}) =>
  validateBody(
    { [field]: query.get(field) },
    { [field]: validators.int(options) }
  )[field];

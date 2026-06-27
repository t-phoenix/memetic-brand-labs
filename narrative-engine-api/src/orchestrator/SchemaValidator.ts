import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaCache = new Map<string, ReturnType<typeof ajv.compile>>();

export class SchemaValidator {
  validate(schemaKey: string, schema: object, data: unknown): { valid: boolean; errors?: unknown } {
    let validate = schemaCache.get(schemaKey);
    if (!validate) {
      validate = ajv.compile(schema);
      schemaCache.set(schemaKey, validate);
    }
    const valid = validate(data);
    if (!valid) {
      return { valid: false, errors: validate.errors };
    }
    return { valid: true };
  }
}

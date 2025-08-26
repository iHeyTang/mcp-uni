import { z } from 'zod';
import { JSONSchema } from 'zod/v4/core';

/**
 * Convert JSON Schema to Zod Schema
 * @param schema JSON Schema object
 * @returns Corresponding Zod Schema
 */
export function jsonSchemaToZod(schema: JSONSchema.Schema): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  // Handle oneOf (union type)
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const schemas = schema.oneOf.map(s => jsonSchemaToZod(s as JSONSchema.Schema));
    return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  // Handle anyOf (union type, at least one match)
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const schemas = schema.anyOf.map(s => jsonSchemaToZod(s as JSONSchema.Schema));
    return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  // Handle allOf (intersection type)
  if (schema.allOf && Array.isArray(schema.allOf)) {
    let result = jsonSchemaToZod(schema.allOf[0] as JSONSchema.Schema);
    for (let i = 1; i < schema.allOf.length; i++) {
      result = result.and(jsonSchemaToZod(schema.allOf[i] as JSONSchema.Schema));
    }
    return result;
  }

  // Handle not (negation type)
  if (schema.not) {
    // Zod doesn't have direct not operation, return any as fallback
    return z.any();
  }

  // Handle enum
  if (schema.enum && Array.isArray(schema.enum)) {
    return z.enum(schema.enum as [string, ...string[]]);
  }

  // Handle const
  if (schema.const !== undefined) {
    return z.literal(schema.const);
  }

  // Handle basic types based on type
  switch (schema.type) {
    case 'string': {
      let stringSchema = z.string();

      if (schema.minLength !== undefined) {
        stringSchema = stringSchema.min(schema.minLength);
      }
      if (schema.maxLength !== undefined) {
        stringSchema = stringSchema.max(schema.maxLength);
      }
      if (schema.pattern) {
        stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      }
      if (schema.format) {
        switch (schema.format) {
          case 'email':
            stringSchema = stringSchema.email();
            break;
          case 'uri':
            stringSchema = stringSchema.url();
            break;
          case 'date':
            stringSchema = stringSchema.date();
            break;
          case 'date-time':
            stringSchema = stringSchema.datetime();
            break;
          case 'uuid':
            stringSchema = stringSchema.uuid();
            break;
        }
      }

      return stringSchema;
    }

    case 'number':
    case 'integer': {
      let numberSchema = schema.type === 'integer' ? z.number().int() : z.number();

      if (schema.minimum !== undefined) {
        numberSchema = numberSchema.min(schema.minimum);
      }
      if (schema.maximum !== undefined) {
        numberSchema = numberSchema.max(schema.maximum);
      }

      return numberSchema;
    }

    case 'boolean':
      return z.boolean();

    case 'array': {
      if (schema.items) {
        return z.array(jsonSchemaToZod(schema.items as JSONSchema.Schema));
      }
      return z.array(z.any());
    }

    case 'object': {
      if (!schema.properties) {
        return z.object({});
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      const required = schema.required || [];

      for (const [key, propSchema] of Object.entries(schema.properties)) {
        let zodSchema = jsonSchemaToZod(propSchema as JSONSchema.Schema);

        // If not required, make it optional
        if (!required.includes(key)) {
          zodSchema = zodSchema.optional();
        }

        shape[key] = zodSchema;
      }

      return z.object(shape);
    }

    case 'null':
      return z.null();

    default:
      // If no type or unknown type, return any
      return z.any();
  }
}

/**
 * Convert JSON Schema to Zod Schema
 * @param inputSchema JSON Schema
 * @returns Corresponding Zod Schema
 */
export function toZod(inputSchema: any): z.ZodTypeAny {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return z.object({});
  }

  // If inputSchema is already a Zod Schema, return directly
  if (inputSchema._def || inputSchema.parse) {
    return inputSchema;
  }

  // If it's a JSON Schema, convert to Zod Schema
  return jsonSchemaToZod(inputSchema);
}

/**
 * Convert JSON Schema to ZodRawShape (for MCP Server)
 * @param inputSchema JSON Schema
 * @returns Corresponding ZodRawShape
 */
export function toZodRawShape(inputSchema: any): z.ZodRawShape {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return {};
  }

  // If inputSchema is already a ZodRawShape, return directly
  if (inputSchema && !inputSchema.type && !(inputSchema as any)._def && !(inputSchema as any).parse) {
    // Check if it's already in ZodRawShape format
    const isZodRawShape = Object.values(inputSchema).every(
      value => value && typeof value === 'object' && ((value as any)._def || (value as any).parse)
    );
    if (isZodRawShape) {
      return inputSchema as z.ZodRawShape;
    }
  }

  // If it's a JSON Schema, convert to Zod Schema, then extract shape
  const zodSchema = jsonSchemaToZod(inputSchema);

  // If the converted schema is object type, extract its shape
  if (zodSchema._def && zodSchema._def.typeName === 'ZodObject') {
    return zodSchema._def.shape();
  }

  // Otherwise return empty object
  return {};
}

// Fastify uses these JSON Schema objects for request validation (ajv)
// and response serialization. Response schemas are important:
// Fastify's serializer ONLY outputs fields listed in the schema,
// so password_hash is impossible to leak even if accidentally
// included in a DB query result.

export const registerBodySchema = {
  type: 'object',
  required: ['email', 'password', 'full_name', 'role'],
  additionalProperties: false,
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 254,
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      // Must contain at least one letter and one digit
      pattern: '^(?=.*[A-Za-z])(?=.*\\d).+$',
      description: 'Minimum 8 characters, must include a letter and a number',
    },
    full_name: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
    },
    role: {
      type: 'string',
      enum: ['worker', 'verifier', 'advocate'],
    },
    phone: {
      type: 'string',
      // Pakistani: 03XXXXXXXXX or +923XXXXXXXXX
      pattern: '^(03[0-9]{9}|\\+923[0-9]{9})$',
    },
    city: {
      type: 'string',
      maxLength: 100,
    },
    city_zone: {
      type: 'string',
      maxLength: 100,
    },
    worker_category: {
      type: 'string',
      enum: ['ride_hailing', 'food_delivery', 'freelance', 'domestic', 'other'],
    },
  },
};

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email:    { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1, maxLength: 128 },
  },
};

export const refreshBodySchema = {
  type: 'object',
  required: ['refresh_token'],
  additionalProperties: false,
  properties: {
    refresh_token: { type: 'string', minLength: 10 },
  },
};

// Safe user object — password_hash and internal fields excluded.
// nullable: true is required for optional fields so Fastify
// serializer does not drop null values or throw on them.
export const safeUserSchema = {
  type: 'object',
  properties: {
    id:              { type: 'string' },
    email:           { type: 'string' },
    full_name:       { type: 'string' },
    phone:           { type: ['string', 'null'] },
    role:            { type: 'string' },
    city:            { type: ['string', 'null'] },
    city_zone:       { type: ['string', 'null'] },
    worker_category: { type: ['string', 'null'] },
    is_active:           { type: 'boolean' },
    is_verified:         { type: 'boolean' },
    email_verified:      { type: 'boolean' },
    verification_status: { type: 'string' },
    created_at:          { type: 'string' },
    last_login_at:       { type: ['string', 'null'] },
  },
};

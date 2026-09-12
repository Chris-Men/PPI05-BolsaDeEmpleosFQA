// Unit tests must never reuse real credentials or connect to a development database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit_test:unit_test@127.0.0.1:1/fqa_unit_test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'unit-test-signing-key-with-more-than-thirty-two-characters';

export {};

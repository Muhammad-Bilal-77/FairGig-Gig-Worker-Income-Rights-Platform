-- Insert test accounts for each role
-- Password: Test123! (bcrypt hash)
INSERT INTO auth_schema.users (
  email, 
  password_hash, 
  full_name, 
  role, 
  phone, 
  city, 
  is_active, 
  is_verified, 
  email_verified, 
  verification_status
) VALUES 
(
  'worker@test.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGGRhqnz8bh3eXbhB.n5k8J6j4a',
  'Ahmed Worker',
  'worker',
  '03001234567',
  'Karachi',
  true,
  true,
  true,
  'APPROVED'
),
(
  'verifier@test.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGGRhqnz8bh3eXbhB.n5k8J6j4a',
  'Fatima Verifier',
  'verifier',
  '03001234568',
  'Lahore',
  true,
  true,
  true,
  'APPROVED'
),
(
  'advocate@test.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGGRhqnz8bh3eXbhB.n5k8J6j4a',
  'Dr. Advocate',
  'advocate',
  '03001234569',
  'Islamabad',
  true,
  true,
  true,
  'APPROVED'
);

SELECT 'Test accounts created successfully' as status;
SELECT email, full_name, role, verification_status FROM auth_schema.users ORDER BY created_at;

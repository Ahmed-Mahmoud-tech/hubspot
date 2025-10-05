-- Add role column to users table
ALTER TABLE users ADD COLUMN role varchar(10) DEFAULT 'user';

-- Create a constraint to ensure only valid roles
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- Create an index on role for performance
CREATE INDEX idx_users_role ON users(role);
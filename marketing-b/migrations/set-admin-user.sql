-- Script to set an existing user as admin
-- Replace 'your-email@example.com' with the actual email of the user you want to make admin

UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify the change
SELECT id, first_name, last_name, email, role, verified 
FROM users 
WHERE email = 'your-email@example.com';
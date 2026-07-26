-- ==============================================================================
-- Update Demo Credentials
-- ==============================================================================

-- Update Admin User Password and Employee ID
UPDATE auth.users 
SET encrypted_password = extensions.crypt('secretAdmin99', extensions.gen_salt('bf'))
WHERE email IN ('admin001@busdepot.com', 'manager01@busdepot.com');

UPDATE public.profiles
SET employee_id = 'MANAGER01'
WHERE employee_id = 'ADMIN001';

-- Update Employee User Password and Employee ID
UPDATE auth.users 
SET encrypted_password = extensions.crypt('staffPass123', extensions.gen_salt('bf'))
WHERE email IN ('emp001@busdepot.com', 'staff01@busdepot.com');

UPDATE public.profiles
SET employee_id = 'STAFF01'
WHERE employee_id = 'EMP001';

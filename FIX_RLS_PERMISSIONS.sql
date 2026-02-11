
-- 1. Create a secure function to get the current user's tenant_id
-- This avoids "infinite recursion" when querying the profiles table inside a policy
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop potential conflicting or restrictive policies
DROP POLICY IF EXISTS "Profiles visible by same tenant" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- 3. Create the granular policies

-- Policy A: Everyone can see their OWN profile (fallback)
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING ( auth.uid() = id );

-- Policy B: Users can see ALL profiles that belong to their same Tenant
CREATE POLICY "Profiles visible by same tenant" 
ON profiles FOR SELECT 
USING ( 
    tenant_id = get_auth_tenant_id() 
);

-- 4. Enable RLS (Ensure it is on)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

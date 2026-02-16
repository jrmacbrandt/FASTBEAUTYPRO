-- Function to check for duplicate Email or CPF during registration
-- This function runs with elevated privileges (SECURITY DEFINER) to check auth.users and profiles
-- independently of row-level security policies.

CREATE OR REPLACE FUNCTION check_registration_uniqueness(
  p_email text,
  p_cpf text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth -- Secure search path
AS $$
DECLARE
  v_email_exists boolean;
  v_cpf_exists boolean;
  v_clean_cpf text;
BEGIN
  -- Normalize Inputs
  v_clean_cpf := regexp_replace(p_cpf, '\D', '', 'g');

  -- 1. Check Email in Auth Users (Primary Login Identity)
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO v_email_exists;
  
  -- 2. Check CPF in Profiles (Business Identity)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE cpf = v_clean_cpf
  ) INTO v_cpf_exists;

  -- 3. Return Logic
  IF v_email_exists THEN
    RETURN json_build_object(
      'status', 'error', 
      'field', 'email', 
      'message', 'Este e-mail já está cadastrado no sistema. Tente fazer login ou recupere sua senha.'
    );
  END IF;

  IF v_cpf_exists THEN
    RETURN json_build_object(
      'status', 'error', 
      'field', 'cpf', 
      'message', 'Este CPF já possui uma conta ativa. Por favor, utilize outro CPF ou contate o suporte.'
    );
  END IF;

  RETURN json_build_object('status', 'success');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', 'Erro interno ao verificar dados: ' || SQLERRM);
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION check_registration_uniqueness(text, text) TO anon, authenticated, service_role;

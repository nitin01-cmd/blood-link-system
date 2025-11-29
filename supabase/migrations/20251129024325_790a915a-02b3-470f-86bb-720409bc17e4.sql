-- Fix search_path for functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.handle_donation_stock_update() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_donation_stock_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blood_stock
  SET units_available = units_available + NEW.units_donated,
      updated_at = now()
  WHERE blood_group = NEW.blood_group;
  
  UPDATE public.donors
  SET last_donation_date = NEW.donation_date,
      next_eligible_date = NEW.donation_date + INTERVAL '56 days',
      status = 'temporary_defer'
  WHERE id = NEW.donor_id;
  
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.handle_issuance_stock_update() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_issuance_stock_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blood_stock
  SET units_available = units_available - NEW.units_issued,
      updated_at = now()
  WHERE blood_group = NEW.blood_group;
  
  UPDATE public.blood_requests
  SET status = 'issued',
      updated_at = now()
  WHERE id = NEW.request_id;
  
  RETURN NEW;
END;
$$;

-- Recreate all triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON public.recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_donation_created
  AFTER INSERT ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.handle_donation_stock_update();

CREATE TRIGGER on_issuance_created
  AFTER INSERT ON public.issuances
  FOR EACH ROW EXECUTE FUNCTION public.handle_issuance_stock_update();
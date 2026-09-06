-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Accommodations
CREATE TYPE public.accommodation_type AS ENUM ('room', 'tent', 'hall');

CREATE TABLE public.accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type public.accommodation_type NOT NULL,
  capacity integer NOT NULL,
  price_per_night numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accommodations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodations TO authenticated;
GRANT ALL ON public.accommodations TO service_role;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view accommodations" ON public.accommodations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage accommodations" ON public.accommodations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.accommodations (slug, name, type, capacity, price_per_night, description, sort_order) VALUES
  ('room-1', 'Room 1', 'room', 4, 4500, 'Air-conditioned garden-view room with a queen bed and two singles, en-suite bath and private veranda.', 1),
  ('room-2', 'Room 2', 'room', 4, 4500, 'Bright poolside room for four with a queen bed, bunk beds and a rain shower.', 2),
  ('room-3', 'Room 3', 'room', 4, 4500, 'Quiet corner room with two double beds, writing desk and a view of the orchard.', 3),
  ('room-4', 'Room 4', 'room', 4, 4800, 'Family suite for four with a lounge nook, mini fridge and direct garden access.', 4),
  ('tent-1', 'Tent 1', 'tent', 4, 3200, 'Luxury safari tent on a raised deck with proper beds, fans, lanterns and a fire pit.', 5),
  ('tent-2', 'Tent 2', 'tent', 4, 3200, 'Glamping tent beside the mango grove, sleeps four, with an outdoor shower.', 6),
  ('hall-1', 'Hall 1', 'hall', 16, 15000, 'Grand hall for up to 16 guests — ideal for family gatherings, retreats and celebrations.', 7),
  ('hall-2', 'Hall 2', 'hall', 10, 10000, 'Intimate hall for up to 10 guests with a private terrace overlooking the pool.', 8);

-- Blocked dates
CREATE TABLE public.accommodation_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accommodation_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_blocks TO authenticated;
GRANT ALL ON public.accommodation_blocks TO service_role;
ALTER TABLE public.accommodation_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blocks" ON public.accommodation_blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage blocks" ON public.accommodation_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  message text,
  status public.booking_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings or admin" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND check_out > check_in);
CREATE POLICY "Admins update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public booked ranges (no personal details)
CREATE OR REPLACE FUNCTION public.get_booked_ranges(_from date, _to date)
RETURNS TABLE (accommodation_id uuid, check_in date, check_out date, status public.booking_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT accommodation_id, check_in, check_out, status
  FROM public.bookings
  WHERE status IN ('pending', 'confirmed') AND check_in < _to AND check_out > _from
$$;
GRANT EXECUTE ON FUNCTION public.get_booked_ranges(date, date) TO anon, authenticated;

-- Resort images
CREATE TABLE public.resort_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  storage_path text,
  caption text,
  category text NOT NULL DEFAULT 'gallery',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resort_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resort_images TO authenticated;
GRANT ALL ON public.resort_images TO service_role;
ALTER TABLE public.resort_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view images" ON public.resort_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage images" ON public.resort_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER accommodations_updated_at BEFORE UPDATE ON public.accommodations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies (private bucket; admin manages, everyone can read via signed URLs)
CREATE POLICY "Admins read resort images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resort-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload resort images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resort-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update resort images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resort-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete resort images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resort-images' AND public.has_role(auth.uid(), 'admin'));
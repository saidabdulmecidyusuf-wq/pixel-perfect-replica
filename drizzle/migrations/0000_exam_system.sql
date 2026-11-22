
CREATE TYPE public.app_role AS ENUM ('admin', 'course_manager');
CREATE TYPE public.error_category AS ENUM ('tecvid', 'harf', 'diger');

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Course managers (one course per manager)
CREATE TABLE public.course_managers (
  user_id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_managers TO authenticated;
GRANT ALL ON public.course_managers TO service_role;
ALTER TABLE public.course_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.managed_course_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT course_id FROM public.course_managers WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Admins read managers, managers read self" ON public.course_managers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers read own course" ON public.courses FOR SELECT TO authenticated
  USING (id = public.managed_course_id(auth.uid()));

-- Students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX students_course_idx ON public.students(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers read own students" ON public.students FOR SELECT TO authenticated
  USING (course_id = public.managed_course_id(auth.uid()));

-- Exams (one per month)
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_year int NOT NULL CHECK (exam_year BETWEEN 2000 AND 2200),
  exam_month int NOT NULL CHECK (exam_month BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_year, exam_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage exams" ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers read exams" ON public.exams FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'course_manager'));

-- Error types
CREATE TABLE public.error_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.error_category NOT NULL DEFAULT 'tecvid',
  deduction numeric(5,2) NOT NULL DEFAULT 1 CHECK (deduction >= 0 AND deduction <= 100),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_types TO authenticated;
GRANT ALL ON public.error_types TO service_role;
ALTER TABLE public.error_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage error types" ON public.error_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers read error types" ON public.error_types FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'course_manager'));

INSERT INTO public.error_types (name, category, deduction, sort_order) VALUES
  ('Med', 'tecvid', 2, 1),
  ('Gunne', 'tecvid', 2, 2),
  ('İdğam', 'tecvid', 2, 3),
  ('İhfa', 'tecvid', 2, 4),
  ('İklab', 'tecvid', 2, 5),
  ('İzhar', 'tecvid', 2, 6),
  ('Kalkale', 'tecvid', 1, 7),
  ('Ra (kalın/ince)', 'tecvid', 1, 8),
  ('Vakf ve ibtida', 'tecvid', 2, 9),
  ('Mahreç', 'harf', 3, 10),
  ('Sıfat', 'harf', 2, 11),
  ('Hareke', 'harf', 3, 12),
  ('Harf atlama / ekleme', 'harf', 3, 13),
  ('Takılma / duraklama', 'diger', 1, 14),
  ('Kelime atlama', 'diger', 5, 15);

-- Results
CREATE TABLE public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  kiraat_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  kiraat numeric(5,2) NOT NULL DEFAULT 100,
  tecvid_deduction numeric(6,2) NOT NULL DEFAULT 0,
  ezber numeric(5,2) NOT NULL DEFAULT 0 CHECK (ezber BETWEEN 0 AND 100),
  ilmihal numeric(5,2) NOT NULL DEFAULT 0 CHECK (ilmihal BETWEEN 0 AND 100),
  siyer numeric(5,2) NOT NULL DEFAULT 0 CHECK (siyer BETWEEN 0 AND 100),
  total numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
CREATE INDEX exam_results_exam_idx ON public.exam_results(exam_id);
CREATE INDEX exam_results_course_idx ON public.exam_results(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO authenticated;
GRANT ALL ON public.exam_results TO service_role;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage results" ON public.exam_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers read own results" ON public.exam_results FOR SELECT TO authenticated
  USING (course_id = public.managed_course_id(auth.uid()));

-- Auto-calculate Kıraat, Tecvid deduction and total
CREATE OR REPLACE FUNCTION public.calc_exam_result()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  total_ded numeric := 0;
  tecvid_ded numeric := 0;
BEGIN
  SELECT
    COALESCE(SUM(COALESCE((e->>'count')::numeric,0) * COALESCE((e->>'deduction')::numeric,0)), 0),
    COALESCE(SUM(CASE WHEN e->>'category' = 'tecvid'
      THEN COALESCE((e->>'count')::numeric,0) * COALESCE((e->>'deduction')::numeric,0) ELSE 0 END), 0)
  INTO total_ded, tecvid_ded
  FROM jsonb_array_elements(COALESCE(NEW.kiraat_errors, '[]'::jsonb)) e;

  NEW.kiraat := GREATEST(0, 100 - total_ded);
  NEW.tecvid_deduction := tecvid_ded;
  NEW.total := ROUND((NEW.kiraat + NEW.ezber + NEW.ilmihal + NEW.siyer) / 4.0, 2);
  NEW.course_id := (SELECT course_id FROM public.students WHERE id = NEW.student_id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER exam_results_calc BEFORE INSERT OR UPDATE ON public.exam_results
  FOR EACH ROW EXECUTE FUNCTION public.calc_exam_result();

-- Keep course_id on results in sync if a student moves course
CREATE OR REPLACE FUNCTION public.sync_result_course()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.course_id IS DISTINCT FROM OLD.course_id THEN
    UPDATE public.exam_results SET course_id = NEW.course_id WHERE student_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER students_sync_course AFTER UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_result_course();

-- Settings (single row)
CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  region_name text NOT NULL DEFAULT 'Addis Ababa Mıntıkası',
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_settings (id) VALUES (1);

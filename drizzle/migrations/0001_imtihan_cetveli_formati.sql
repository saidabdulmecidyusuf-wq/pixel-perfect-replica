ALTER TABLE public.error_types ADD COLUMN repeat_deduction numeric, ADD COLUMN max_deduction numeric;

ALTER TABLE public.courses ADD COLUMN group_leader text NOT NULL DEFAULT '', ADD COLUMN group_level text NOT NULL DEFAULT '';

ALTER TABLE public.app_settings ADD COLUMN bolge_name text NOT NULL DEFAULT 'DOĞU AFRİKA';

ALTER TABLE public.exam_results ADD COLUMN sheet_marks jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.exam_sheets (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  examiner text NOT NULL DEFAULT '',
  exam_date date,
  kiraat_topic text NOT NULL DEFAULT '',
  ezber_topic_1 text NOT NULL DEFAULT '',
  ezber_topic_2 text NOT NULL DEFAULT '',
  note_yuzune text NOT NULL DEFAULT '',
  note_ezber text NOT NULL DEFAULT '',
  note_ilmihal text NOT NULL DEFAULT '',
  note_siyer text NOT NULL DEFAULT '',
  note_genel text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sheets TO authenticated;
GRANT ALL ON public.exam_sheets TO service_role;
ALTER TABLE public.exam_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sheets" ON public.exam_sheets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers read own sheets" ON public.exam_sheets FOR SELECT TO authenticated
  USING (course_id = public.managed_course_id(auth.uid()));

-- Kıraat: first error costs `deduction`, every further error `repeat_deduction`
-- (defaults to `deduction`), capped at `max_deduction` when set.
CREATE OR REPLACE FUNCTION public.calc_exam_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_ded numeric := 0;
  tecvid_ded numeric := 0;
BEGIN
  WITH items AS (
    SELECT e->>'category' AS cat,
      CASE WHEN COALESCE((e->>'count')::numeric,0) <= 0 THEN 0
      ELSE LEAST(
        COALESCE(NULLIF(e->>'max_deduction','')::numeric, 1e9),
        COALESCE((e->>'deduction')::numeric,0)
          + (COALESCE((e->>'count')::numeric,0) - 1)
            * COALESCE(NULLIF(e->>'repeat_deduction','')::numeric, (e->>'deduction')::numeric, 0)
      ) END AS lost
    FROM jsonb_array_elements(COALESCE(NEW.kiraat_errors, '[]'::jsonb)) e
  )
  SELECT COALESCE(SUM(lost),0), COALESCE(SUM(CASE WHEN cat = 'tecvid' THEN lost ELSE 0 END),0)
  INTO total_ded, tecvid_ded FROM items;

  NEW.kiraat := GREATEST(0, 100 - total_ded);
  NEW.tecvid_deduction := tecvid_ded;
  NEW.total := ROUND((NEW.kiraat + NEW.ezber + NEW.ilmihal + NEW.siyer) / 4.0, 2);
  NEW.course_id := (SELECT course_id FROM public.students WHERE id = NEW.student_id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DELETE FROM public.error_types;
INSERT INTO public.error_types (name, category, deduction, repeat_deduction, max_deduction, sort_order) VALUES
  ('Zât-ı Harf', 'harf', 2, 2, NULL, 1),
  ('Kırâatteki Meleke', 'tecvid', 1, 1, 2, 2),
  ('Hareke - Şedde', 'tecvid', 1, 1, 2, 3),
  ('Kalın - İnce', 'tecvid', 1, 1, 2, 4),
  ('Vakıf - Vasıl', 'tecvid', 1, 1, 2, 5),
  ('Sâkin harfe hareke verme', 'tecvid', 1, 1, 2, 6),
  ('Med Bahsi', 'tecvid', 1, 1, 2, 7),
  ('İhfa - İzhar - İklab', 'tecvid', 1, 1, 2, 8),
  ('İdğâm Bahsi - Müşeddede - Şefevi', 'tecvid', 1, 1, 2, 9),
  ('Kalkale - Hükmü''r-râ', 'tecvid', 1, 1, 2, 10),
  ('Lafzatullah - Zamir - Sekte', 'tecvid', 1, 1, 2, 11);
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.allotment_applications (
  id integer NOT NULL DEFAULT nextval('allotment_applications_id_seq'::regclass),
  application_id character varying NOT NULL UNIQUE,
  user_id integer,
  preferred_hostel_id integer,
  room_type_preference character varying NOT NULL,
  course character varying NOT NULL,
  academic_year character varying NOT NULL,
  performance_type character varying NOT NULL CHECK (performance_type::text = ANY (ARRAY['rank'::character varying::text, 'cgpa'::character varying::text])),
  performance_value numeric NOT NULL,
  distance_from_home numeric NOT NULL,
  distance_unit character varying DEFAULT 'km'::character varying,
  guardian_name character varying NOT NULL,
  guardian_phone character varying NOT NULL,
  home_address text NOT NULL,
  medical_info text,
  special_requests text,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text, 'allocated'::character varying::text])),
  priority_score numeric DEFAULT 0,
  reviewed_by integer,
  reviewed_at timestamp without time zone,
  allocated_room_id integer,
  allocated_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT allotment_applications_pkey PRIMARY KEY (id),
  CONSTRAINT allotment_applications_preferred_hostel_id_fkey FOREIGN KEY (preferred_hostel_id) REFERENCES public.hostels(hostel_id),
  CONSTRAINT allotment_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id),
  CONSTRAINT allotment_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT allotment_applications_allocated_room_id_fkey FOREIGN KEY (allocated_room_id) REFERENCES public.rooms(room_id)
);
CREATE TABLE public.audit_logs (
  id bigint NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass),
  ts timestamp with time zone DEFAULT now(),
  level text DEFAULT 'INFO'::text,
  actor_user_id bigint,
  action text,
  details jsonb,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fees (
  fee_id bigint NOT NULL DEFAULT nextval('fees_fee_id_seq'::regclass),
  student_id bigint NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  paid_amount numeric NOT NULL DEFAULT 0 CHECK (paid_amount >= 0::numeric),
  status text NOT NULL DEFAULT 'Pending'::text CHECK (status = ANY (ARRAY['Pending'::text, 'Partially Paid'::text, 'Paid'::text, 'Overdue'::text, 'Cancelled'::text])),
  due_date date,
  paid_at timestamp with time zone,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fees_pkey PRIMARY KEY (fee_id),
  CONSTRAINT fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.hostels (
  hostel_id integer NOT NULL DEFAULT nextval('hostels_hostel_id_seq'::regclass),
  hostel_name character varying NOT NULL,
  hostel_type character varying NOT NULL CHECK (hostel_type::text = ANY (ARRAY['Boys'::character varying::text, 'Girls'::character varying::text])),
  warden_id integer,
  total_rooms integer CHECK (total_rooms >= 0),
  location character varying,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hostels_pkey PRIMARY KEY (hostel_id),
  CONSTRAINT hostels_warden_id_fkey FOREIGN KEY (warden_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.maintenance_expenses (
  expense_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  request_id bigint NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  description text,
  vendor text,
  paid_at timestamp with time zone,
  created_by bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_expenses_pkey PRIMARY KEY (expense_id),
  CONSTRAINT maintenance_expenses_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(request_id),
  CONSTRAINT maintenance_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.maintenance_requests (
  request_id integer NOT NULL DEFAULT nextval('maintenance_requests_request_id_seq'::regclass),
  student_id integer,
  room_id integer,
  category character varying CHECK (category::text = ANY (ARRAY['Electricity'::character varying::text, 'Plumbing'::character varying::text, 'Cleaning'::character varying::text, 'Other'::character varying::text])),
  description text,
  status character varying DEFAULT 'Pending'::character varying CHECK (status::text = ANY (ARRAY['Pending'::character varying::text, 'In Progress'::character varying::text, 'Completed'::character varying::text])),
  assigned_to character varying,
  priority character varying DEFAULT 'Medium'::character varying CHECK (priority::text = ANY (ARRAY['Low'::character varying::text, 'Medium'::character varying::text, 'High'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT maintenance_requests_pkey PRIMARY KEY (request_id),
  CONSTRAINT maintenance_requests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(room_id),
  CONSTRAINT maintenance_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.maintenance_schedules (
  schedule_id bigint NOT NULL DEFAULT nextval('maintenance_schedules_schedule_id_seq'::regclass),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category = ANY (ARRAY['Electricity'::text, 'Plumbing'::text, 'Cleaning'::text, 'Other'::text])),
  priority text NOT NULL DEFAULT 'Medium'::text CHECK (priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text])),
  scheduled_for timestamp with time zone NOT NULL,
  hostel_id bigint,
  room_id bigint,
  assigned_to text,
  status text NOT NULL DEFAULT 'Planned'::text CHECK (status = ANY (ARRAY['Planned'::text, 'Scheduled'::text, 'Completed'::text, 'Cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (schedule_id),
  CONSTRAINT maintenance_schedules_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(hostel_id),
  CONSTRAINT maintenance_schedules_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(room_id)
);
CREATE TABLE public.notifications (
  notification_id integer NOT NULL DEFAULT nextval('notifications_notification_id_seq'::regclass),
  sender_id integer,
  receiver_role character varying CHECK (receiver_role::text = ANY (ARRAY['Student'::character varying::text, 'Warden'::character varying::text, 'All'::character varying::text])),
  receiver_id integer,
  title character varying,
  message text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notifications_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(user_id),
  CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.payments (
  payment_id bigint NOT NULL DEFAULT nextval('payments_payment_id_seq'::regclass),
  fee_id bigint NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  method text DEFAULT 'UPI'::text,
  reference text,
  paid_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payments_fee_id_fkey FOREIGN KEY (fee_id) REFERENCES public.fees(fee_id)
);
CREATE TABLE public.room_allotments (
  allotment_id integer NOT NULL DEFAULT nextval('room_allotments_allotment_id_seq'::regclass),
  student_id integer,
  room_id integer,
  allotment_date date DEFAULT CURRENT_DATE,
  status character varying DEFAULT 'Pending'::character varying CHECK (status::text = ANY (ARRAY['Active'::character varying::text, 'Vacated'::character varying::text, 'Pending'::character varying::text])),
  vacated_date date,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT room_allotments_pkey PRIMARY KEY (allotment_id),
  CONSTRAINT room_allotments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(room_id),
  CONSTRAINT room_allotments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.room_types (
  id integer NOT NULL DEFAULT nextval('room_types_id_seq'::regclass),
  name character varying NOT NULL,
  occupancy integer NOT NULL CHECK (occupancy > 0),
  monthly_fee numeric NOT NULL,
  security_deposit numeric NOT NULL DEFAULT 0,
  facilities ARRAY,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT room_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rooms (
  room_id integer NOT NULL DEFAULT nextval('rooms_room_id_seq'::regclass),
  hostel_id integer,
  room_no character varying NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  status character varying DEFAULT 'Vacant'::character varying CHECK (status::text = ANY (ARRAY['Vacant'::character varying::text, 'Occupied'::character varying::text, 'Under Maintenance'::character varying::text])),
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rooms_pkey PRIMARY KEY (room_id),
  CONSTRAINT rooms_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(hostel_id)
);
CREATE TABLE public.student_issues (
  issue_id bigint NOT NULL DEFAULT nextval('student_issues_issue_id_seq'::regclass),
  student_id bigint,
  user_id bigint,
  category text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_issues_pkey PRIMARY KEY (issue_id),
  CONSTRAINT student_issues_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id),
  CONSTRAINT student_issues_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.students (
  student_id integer NOT NULL DEFAULT nextval('students_student_id_seq'::regclass),
  user_id integer UNIQUE,
  name character varying NOT NULL,
  reg_no character varying NOT NULL UNIQUE,
  year_of_study integer NOT NULL CHECK (year_of_study >= 1 AND year_of_study <= 5),
  department character varying,
  keam_rank integer,
  distance_category character varying CHECK (distance_category::text = ANY (ARRAY['<25km'::character varying::text, '25-50km'::character varying::text, '>50km'::character varying::text])),
  category character varying CHECK (category::text = ANY (ARRAY['General'::character varying::text, 'OBC'::character varying::text, 'SC'::character varying::text, 'ST'::character varying::text, 'Other'::character varying::text])),
  sgpa numeric CHECK (sgpa >= 0::numeric AND sgpa <= 10::numeric),
  backlogs integer DEFAULT 0 CHECK (backlogs >= 0),
  CONSTRAINT students_pkey PRIMARY KEY (student_id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.system_settings (
  key text NOT NULL,
  settings_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.users (
  user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
  username character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['Student'::character varying::text, 'Warden'::character varying::text, 'SuperAdmin'::character varying::text])),
  email character varying UNIQUE,
  phone character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  last_login timestamp without time zone,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);
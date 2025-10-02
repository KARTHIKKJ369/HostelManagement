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
  CONSTRAINT allotment_applications_allocated_room_id_fkey FOREIGN KEY (allocated_room_id) REFERENCES public.rooms(room_id),
  CONSTRAINT allotment_applications_preferred_hostel_id_fkey FOREIGN KEY (preferred_hostel_id) REFERENCES public.hostels(hostel_id),
  CONSTRAINT allotment_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id),
  CONSTRAINT allotment_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.hostels (
  hostel_id integer NOT NULL DEFAULT nextval('hostels_hostel_id_seq'::regclass),
  hostel_name character varying NOT NULL,
  hostel_type character varying NOT NULL CHECK (hostel_type::text = ANY (ARRAY['Boys'::character varying::text, 'Girls'::character varying::text])),
  warden_id integer,
  total_rooms integer CHECK (total_rooms >= 0),
  location character varying,
  CONSTRAINT hostels_pkey PRIMARY KEY (hostel_id),
  CONSTRAINT hostels_warden_id_fkey FOREIGN KEY (warden_id) REFERENCES public.users(user_id)
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
CREATE TABLE public.room_allotments (
  allotment_id integer NOT NULL DEFAULT nextval('room_allotments_allotment_id_seq'::regclass),
  student_id integer,
  room_id integer,
  allotment_date date DEFAULT CURRENT_DATE,
  status character varying DEFAULT 'Pending'::character varying CHECK (status::text = ANY (ARRAY['Active'::character varying::text, 'Vacated'::character varying::text, 'Pending'::character varying::text])),
  vacated_date date,
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
  CONSTRAINT rooms_pkey PRIMARY KEY (room_id),
  CONSTRAINT rooms_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(hostel_id)
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
-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  teacher_id uuid references profiles(id),
  full_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Question papers
create table question_papers (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  marking_scheme jsonb not null,
  image_paths text[] not null default '{}',
  created_at timestamptz default now()
);

alter table question_papers enable row level security;

-- Answer sheets
create table answer_sheets (
  id uuid primary key default gen_random_uuid(),
  question_paper_id uuid not null references question_papers(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  image_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'grading', 'graded', 'reviewed')),
  ai_grade jsonb,
  teacher_grade jsonb,
  teacher_comment text,
  final_grade jsonb generated always as (coalesce(teacher_grade, ai_grade)) stored,
  graded_at timestamptz,
  created_at timestamptz default now()
);

alter table answer_sheets enable row level security;

-- RLS Policies

-- Profiles: users see own profile; teachers see their students
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Teachers can view their students" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'teacher' and p.id = profiles.teacher_id
    )
  );

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Question papers: teachers CRUD own; students read via answer_sheets join
create policy "Teachers can view own question papers" on question_papers
  for select using (auth.uid() = teacher_id);

create policy "Teachers can insert own question papers" on question_papers
  for insert with check (auth.uid() = teacher_id);

create policy "Teachers can update own question papers" on question_papers
  for update using (auth.uid() = teacher_id);

create policy "Teachers can delete own question papers" on question_papers
  for delete using (auth.uid() = teacher_id);

-- Answer sheets: student INSERT own; teacher CRUD for their students; student READ own
create policy "Students can view own answer sheets" on answer_sheets
  for select using (auth.uid() = student_id);

create policy "Teachers can view answer sheets for their students" on answer_sheets
  for select using (
    exists (
      select 1 from question_papers qp
      join profiles p on p.id = qp.teacher_id
      where qp.id = answer_sheets.question_paper_id
      and p.id = auth.uid()
      and p.role = 'teacher'
    )
  );

create policy "Students can insert own answer sheets" on answer_sheets
  for insert with check (auth.uid() = student_id);

create policy "Teachers can update answer sheets for their students" on answer_sheets
  for update using (
    exists (
      select 1 from question_papers qp
      join profiles p on p.id = qp.teacher_id
      where qp.id = answer_sheets.question_paper_id
      and p.id = auth.uid()
      and p.role = 'teacher'
    )
  );

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('question-papers', 'question-papers', true),
  ('answer-sheets', 'answer-sheets', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Teachers can upload question paper images" on storage.objects
  for insert with check (
    bucket_id = 'question-papers' and
    exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
  );

create policy "Anyone can view question paper images" on storage.objects
  for select using (bucket_id = 'question-papers');

create policy "Students can upload answer sheet images" on storage.objects
  for insert with check (
    bucket_id = 'answer-sheets' and
    exists (select 1 from profiles where id = auth.uid() and role = 'student')
  );

create policy "Teachers can view answer sheet images for their students" on storage.objects
  for select using (
    bucket_id = 'answer-sheets' and
    exists (
      select 1 from answer_sheets a
      join question_papers qp on qp.id = a.question_paper_id
      join profiles p on p.id = qp.teacher_id
      where p.id = auth.uid() and p.role = 'teacher'
      and a.image_paths @> array[objects.name]
    )
  );

create policy "Students can view own answer sheet images" on storage.objects
  for select using (
    bucket_id = 'answer-sheets' and
    exists (
      select 1 from answer_sheets a
      where a.student_id = auth.uid()
      and a.image_paths @> array[objects.name]
    )
  );

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
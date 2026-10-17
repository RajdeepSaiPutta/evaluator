-- Track which provider graded each answer sheet
alter table answer_sheets
  add column if not exists grading_provider text not null default 'groq'
  check (grading_provider in ('groq', 'local'));

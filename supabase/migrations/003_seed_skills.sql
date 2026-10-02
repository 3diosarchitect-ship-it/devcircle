-- Seed skills so new signups can onboarding without admin skill inserts failing mid-flow.
-- Prefer running npm run seed after schema; this is a lightweight skill bootstrap.

insert into public.skills (name, slug, category)
values
  ('Swift', 'swift', 'mobile'),
  ('SwiftUI', 'swiftui', 'mobile'),
  ('iOS', 'ios', 'mobile'),
  ('Android', 'android', 'mobile'),
  ('Flutter', 'flutter', 'mobile'),
  ('React', 'react', 'web'),
  ('React Native', 'react-native', 'mobile'),
  ('Node.js', 'node-js', 'backend'),
  ('MERN', 'mern', 'web'),
  ('Python', 'python', 'backend'),
  ('Django', 'django', 'backend'),
  ('AI / ML', 'ai-ml', 'ai'),
  ('Data Science', 'data-science', 'ai'),
  ('Java', 'java', 'backend'),
  ('Spring Boot', 'spring-boot', 'backend'),
  ('UI/UX', 'ui-ux', 'design'),
  ('DevOps', 'devops', 'infra'),
  ('Cloud', 'cloud', 'infra'),
  ('Cybersecurity', 'cybersecurity', 'security'),
  ('MongoDB', 'mongodb', 'backend'),
  ('JavaScript', 'javascript', 'web'),
  ('TypeScript', 'typescript', 'web'),
  ('ARKit', 'arkit', 'mobile')
on conflict (slug) do nothing;

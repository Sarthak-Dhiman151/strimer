-- Strimer seed data — FAKE data only (spec: never real personal data).
-- Colleges are fictional; email domains use the reserved `.example` TLD so no
-- real student can verify against a seeded college.
--
-- Applies via `supabase db reset` (config: db.seed.sql_paths = ["./seed.sql"]).
-- Runs as `postgres` (service). We set service_role JWT claims so triggers that
-- gate on verification treat this as the server-only admin path, matching how
-- the service key behaves in production.

select set_config('request.jwt.claims', '{"role":"service_role"}', false);

-- ── Colleges ────────────────────────────────────────────────────────────────
insert into public.colleges (id, slug, name, city, state, type, nirf_rank, fee_min, fee_max, website, email_domains) values
  ('ccc00000-0000-4000-8000-00000000c201', 'aurangpur-institute-of-technology', 'Aurangpur Institute of Technology', 'Aurangpur', 'Maharashtra', 'government', 42, 180000, 220000, 'https://ait.example', '{ait.example}'),
  ('ccc00000-0000-4000-8000-00000000c202', 'devsagar-engineering-college', 'Devsagar Engineering College', 'Devsagar', 'Karnataka', 'private', null, 120000, 160000, 'https://devsagar.example', '{devsagar.example}'),
  ('ccc00000-0000-4000-8000-00000000c203', 'northfield-national-university', 'Northfield National University', 'New Delhi', 'Delhi', 'government', 15, 200000, 240000, 'https://nnu.example', '{nnu.example}'),
  ('ccc00000-0000-4000-8000-00000000c204', 'lakshmipur-medical-college', 'Lakshmipur Medical College', 'Lakshmipur', 'Tamil Nadu', 'government', null, 90000, 120000, 'https://lmc.example', '{lmc.example}'),
  ('ccc00000-0000-4000-8000-00000000c205', 'green-valley-university', 'Green Valley University', 'Palampur', 'Himachal Pradesh', 'private', null, 150000, 180000, 'https://gvu.example', '{gvu.example}');

-- ── Auth users (login email lives only in auth.users; profiles auto-created) ──
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaa00000-0000-4000-8000-000000000101', 'aarav.sharma@ait.example', '{}'),        -- verified student c201
  ('aaa00000-0000-4000-8000-000000000102', 'priya.verma@ait.example', '{}'),          -- verified student c201
  ('aaa00000-0000-4000-8000-000000000103', 'rohan.mehta@ait.example', '{}'),          -- verified alumni c201
  ('aaa00000-0000-4000-8000-000000000104', 'isha.reddy@ait.example', '{}'),           -- verified student c201
  ('aaa00000-0000-4000-8000-000000000105', 'vikram.singh@ait.example', '{}'),         -- verified student c201
  ('aaa00000-0000-4000-8000-000000000106', 'neha.gupta@devsagar.example', '{}'),      -- verified student c202
  ('aaa00000-0000-4000-8000-000000000107', 'arjun.nair@ait.example', '{}'),           -- verified alumni c201
  ('aaa00000-0000-4000-8000-000000000108', 'karthik.rao@nnu.example', '{"handle":"karthik_asks"}'), -- member, pending verification
  ('aaa00000-0000-4000-8000-000000000109', 'meghna.iyer@gmail.example', '{}'),        -- member, unverified
  ('aaa00000-0000-4000-8000-000000000110', 'sanya.kapoor@gmail.example', '{}');       -- member, unverified

-- ── Verifications (email_hash is a fake sha-256-shaped hex string) ──────────
insert into public.verifications (id, user_id, college_id, kind, method, branch, batch_year, email_hash, id_document_path, status, verified_at) values
  ('80000000-0000-4000-8000-000000000801', 'aaa00000-0000-4000-8000-000000000101', 'ccc00000-0000-4000-8000-00000000c201', 'student', 'email', 'CSE', 2025, md5('seed:101') || md5('salt:101'), null, 'approved', now()),
  ('80000000-0000-4000-8000-000000000802', 'aaa00000-0000-4000-8000-000000000102', 'ccc00000-0000-4000-8000-00000000c201', 'student', 'email', 'EE', 2024, md5('seed:102') || md5('salt:102'), null, 'approved', now()),
  ('80000000-0000-4000-8000-000000000803', 'aaa00000-0000-4000-8000-000000000103', 'ccc00000-0000-4000-8000-00000000c201', 'alumni', 'email', 'Mechanical', 2022, md5('seed:103') || md5('salt:103'), null, 'approved', now()),
  ('80000000-0000-4000-8000-000000000804', 'aaa00000-0000-4000-8000-000000000104', 'ccc00000-0000-4000-8000-00000000c201', 'student', 'email', 'CSE', 2026, md5('seed:104') || md5('salt:104'), null, 'approved', now()),
  ('80000000-0000-4000-8000-000000000805', 'aaa00000-0000-4000-8000-000000000105', 'ccc00000-0000-4000-8000-00000000c201', 'student', 'email', 'CSE', 2025, md5('seed:105') || md5('salt:105'), null, 'approved', now()),
  ('80000000-0000-4000-8000-000000000806', 'aaa00000-0000-4000-8000-000000000106', 'ccc00000-0000-4000-8000-00000000c202', 'student', 'email', 'CSE', 2025, md5('seed:106') || md5('salt:106'), null, 'approved', now()),
  ('80000000-0000-4000-8000-000000000807', 'aaa00000-0000-4000-8000-000000000107', 'ccc00000-0000-4000-8000-00000000c201', 'alumni', 'email', 'CSE', 2023, md5('seed:107') || md5('salt:107'), null, 'approved', now()),
  -- ID fallback: carries a fake storage path as its proof (deleted after review)
  ('80000000-0000-4000-8000-000000000808', 'aaa00000-0000-4000-8000-000000000108', 'ccc00000-0000-4000-8000-00000000c203', 'student', 'id', 'CSE', 2026, null, 'verification-ids/fake-u108-id.png', 'pending', null);

-- ── Reviews (service path sets is_verified explicitly; 5 on c201 → rating shows,
--    1 on c202 → rating stays hidden) ─────────────────────────────────────────
insert into public.reviews (id, user_id, college_id, branch, batch_year,
    academics, faculty, placements, campus_hostel, campus_life, value_for_money,
    title, pros, cons, would_choose_again, is_verified) values
  ('50000000-0000-4000-8000-000000000501', 'aaa00000-0000-4000-8000-000000000101', 'ccc00000-0000-4000-8000-00000000c201', 'CSE', 2025, 5, 4, 4, 3, 5, 4,
    'Rigorous coursework, great peer group',
    'Coursework is demanding in the best way. Faculty are reachable after class and the coding culture is strong with active clubs and hackathons every semester.',
    'Hostel blocks are ageing and maintenance is slow. The mess menu repeats and the administration takes weeks for simple paperwork.',
    true, true),
  ('50000000-0000-4000-8000-000000000502', 'aaa00000-0000-4000-8000-000000000102', 'ccc00000-0000-4000-8000-00000000c201', 'EE', 2024, 4, 4, 3, 3, 4, 4,
    'Strong core faculty, placements need work',
    'EE faculty genuinely care about concepts and the labs are well equipped. Campus is compact so everything is a five minute walk away.',
    'Placement cell is understaffed for non-CS branches. Wifi drops in the hostel wings after midnight and hostel food is average at best.',
    true, true),
  ('50000000-0000-4000-8000-000000000503', 'aaa00000-0000-4000-8000-000000000103', 'ccc00000-0000-4000-8000-00000000c201', 'Mechanical', 2022, 4, 5, 4, 4, 4, 4,
    'Alumni network carries far',
    'Mech faculty have real industry experience and the workshop is excellent. The alumni network actively helps with referrals and mentorship.',
    'Sports facilities need funding. Course registration is chaotic every semester and some electives fill up before first years can pick.',
    true, true),
  ('50000000-0000-4000-8000-000000000504', 'aaa00000-0000-4000-8000-000000000104', 'ccc00000-0000-4000-8000-00000000c201', 'CSE', 2026, 4, 4, 4, 4, 4, 3,
    'Balanced all-rounder with solid fests',
    'The annual tech fest is genuinely well run and clubs get real budgets. Academics are fair and the library stays open late during exams.',
    'Fees have climbed each year without matching infrastructure gains. Value for money is the weakest aspect and the campus clinic is basic.',
    true, true),
  ('50000000-0000-4000-8000-000000000505', 'aaa00000-0000-4000-8000-000000000105', 'ccc00000-0000-4000-8000-00000000c201', 'CSE', 2025, 5, 4, 4, 3, 4, 4,
    'Choose it for the people',
    'The peer group is the real product here. Seniors mentor juniors seriously, peer learning is organic and placement preparation starts early.',
    'Campus life outside academics can feel small after two years. Hostel allocation is luck based and first years often get the older blocks.',
    true, true),
  ('50000000-0000-4000-8000-000000000506', 'aaa00000-0000-4000-8000-000000000106', 'ccc00000-0000-4000-8000-00000000c202', 'CSE', 2025, 4, 3, 4, 3, 4, 3,
    'Good teaching, admin needs polish',
    'Teaching quality in the CS department is strong and professors share real project work. The new lab block is well equipped.',
    'Fee refunds and paperwork move slowly through the office. Campus is quiet on weekends and placement support beyond core companies is thin.',
    true, true);

-- ── Community: posts (flairs), threaded comments, one accepted answer ───────
insert into public.posts (id, college_id, user_id, title, body, flair) values
  ('60000000-0000-4000-8000-000000000601', 'ccc00000-0000-4000-8000-00000000c201', 'aaa00000-0000-4000-8000-000000000108', 'Any hostel tips for a first-year at AIT?', 'Moving into hostel next month. What should I bring and which block is best for a CSE first year?', 'question'),
  ('60000000-0000-4000-8000-000000000602', 'ccc00000-0000-4000-8000-00000000c201', 'aaa00000-0000-4000-8000-000000000102', 'Best study spots on campus', 'Looking for quiet corners beyond the hostel room. Where do you all study during exam weeks?', 'discussion'),
  ('60000000-0000-4000-8000-000000000603', 'ccc00000-0000-4000-8000-00000000c201', 'aaa00000-0000-4000-8000-000000000107', 'Branch change experience — what to expect', 'I moved from Civil to CSE in second year. Sharing timelines, CGPA cutoffs and what I wish I knew. Ask anything.', 'advice'),
  ('60000000-0000-4000-8000-000000000604', 'ccc00000-0000-4000-8000-00000000c202', 'aaa00000-0000-4000-8000-000000000106', 'Doubt regarding hostel fee refund timeline', 'Withdrawing from the hostel next month. How long did your refund take and which receipts did the office ask for?', 'question'),
  ('60000000-0000-4000-8000-000000000605', 'ccc00000-0000-4000-8000-00000000c203', 'aaa00000-0000-4000-8000-000000000108', 'NNU CSE cutoff trends for 2026 aspirants', 'Tracking closing ranks for the CSE branch this year. What were the trends in recent rounds?', 'question');

insert into public.comments (id, post_id, parent_id, user_id, body, depth) values
  ('70000000-0000-4000-8000-000000000701', '60000000-0000-4000-8000-000000000601', null, 'aaa00000-0000-4000-8000-000000000101', 'Reach the library block by 6 pm to get a desk during exams. For first years, pick the hostel near the academic block — it saves the morning walk.', 0),
  ('70000000-0000-4000-8000-000000000702', '60000000-0000-4000-8000-000000000601', '70000000-0000-4000-8000-000000000701', 'aaa00000-0000-4000-8000-000000000108', 'Thanks! Is the wifi usable for online classes in the evenings?', 1),
  ('70000000-0000-4000-8000-000000000703', '60000000-0000-4000-8000-000000000601', '70000000-0000-4000-8000-000000000702', 'aaa00000-0000-4000-8000-000000000101', 'Usable in the library and academic block till late. The hostel wings are flaky after midnight, so plan uploads for the day.', 2),
  ('70000000-0000-4000-8000-000000000704', '60000000-0000-4000-8000-000000000602', null, 'aaa00000-0000-4000-8000-000000000103', 'The reading room above the main library is quiet till 11 pm and rarely full outside exam weeks.', 0),
  ('70000000-0000-4000-8000-000000000705', '60000000-0000-4000-8000-000000000604', null, 'aaa00000-0000-4000-8000-000000000105', 'Refunds took me about six weeks. Keep every receipt — the office asks for the original challan copy.', 0);

-- best answer on the question post
update public.posts set accepted_comment_id = '70000000-0000-4000-8000-000000000701'
  where id = '60000000-0000-4000-8000-000000000601';

-- ── Upvotes ────────────────────────────────────────────────────────────────
insert into public.votes (id, user_id, target_type, target_id) values
  ('90000000-0000-4000-8000-000000000901', 'aaa00000-0000-4000-8000-000000000102', 'post', '60000000-0000-4000-8000-000000000601'),
  ('90000000-0000-4000-8000-000000000902', 'aaa00000-0000-4000-8000-000000000103', 'post', '60000000-0000-4000-8000-000000000601'),
  ('90000000-0000-4000-8000-000000000903', 'aaa00000-0000-4000-8000-000000000105', 'post', '60000000-0000-4000-8000-000000000601'),
  ('90000000-0000-4000-8000-000000000904', 'aaa00000-0000-4000-8000-000000000108', 'comment', '70000000-0000-4000-8000-000000000701'),
  ('90000000-0000-4000-8000-000000000905', 'aaa00000-0000-4000-8000-000000000102', 'comment', '70000000-0000-4000-8000-000000000701'),
  ('90000000-0000-4000-8000-000000000906', 'aaa00000-0000-4000-8000-000000000101', 'post', '60000000-0000-4000-8000-000000000604'),
  ('90000000-0000-4000-8000-000000000907', 'aaa00000-0000-4000-8000-000000000106', 'review', '50000000-0000-4000-8000-000000000501'),
  ('90000000-0000-4000-8000-000000000908', 'aaa00000-0000-4000-8000-000000000102', 'review', '50000000-0000-4000-8000-000000000501'),
  ('90000000-0000-4000-8000-000000000909', 'aaa00000-0000-4000-8000-000000000108', 'review', '50000000-0000-4000-8000-000000000506');

-- ── Follows, one open report, notifications ────────────────────────────────
insert into public.follows (user_id, college_id) values
  ('aaa00000-0000-4000-8000-000000000108', 'ccc00000-0000-4000-8000-00000000c201'),
  ('aaa00000-0000-4000-8000-000000000109', 'ccc00000-0000-4000-8000-00000000c201'),
  ('aaa00000-0000-4000-8000-000000000109', 'ccc00000-0000-4000-8000-00000000c203'),
  ('aaa00000-0000-4000-8000-000000000110', 'ccc00000-0000-4000-8000-00000000c202');

insert into public.reports (id, reporter_id, target_type, target_id, reason, details, status) values
  ('a1000000-0000-4000-8000-000000000a01', 'aaa00000-0000-4000-8000-000000000110', 'post', '60000000-0000-4000-8000-000000000603', 'spam', 'Contains referral links to a coaching institute.', 'open');

insert into public.notifications (id, user_id, type, target_type, target_id) values
  ('b2000000-0000-4000-8000-000000000b01', 'aaa00000-0000-4000-8000-000000000108', 'answer', 'post', '60000000-0000-4000-8000-000000000601'),
  ('b2000000-0000-4000-8000-000000000b02', 'aaa00000-0000-4000-8000-000000000101', 'reply', 'comment', '70000000-0000-4000-8000-000000000702'),
  ('b2000000-0000-4000-8000-000000000b03', 'aaa00000-0000-4000-8000-000000000101', 'helpful_vote', 'review', '50000000-0000-4000-8000-000000000501');

-- mod_actions intentionally empty: the audit log starts clean.

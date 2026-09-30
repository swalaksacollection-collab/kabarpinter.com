-- Defense in depth: applicant PII must never be reachable by the anonymous
-- role at all, even if an RLS policy were misconfigured later.
revoke all on table public.contributor_applications from anon;

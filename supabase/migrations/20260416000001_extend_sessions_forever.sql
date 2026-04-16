-- Extend all existing sessions to 10 years from now.
-- Users should never be logged out involuntarily — sessions are effectively forever.
UPDATE sessions
SET expires_at = now() + interval '10 years'
WHERE expires_at > now();

-- RAPID4GRAD V2 Task 7 security closure.
--
-- New PDF objects must only be created with a short-lived signed upload token
-- issued by the server after it verifies the caller is an active student in a
-- functional Lab with remaining shared credits. The server uses service_role
-- to create that token, so authenticated users do not need direct INSERT or
-- UPDATE access to storage.objects.
--
-- Owner SELECT and DELETE policies remain unchanged. A student can still read
-- or remove an existing private PDF, including after leaving a Lab, while no
-- browser client can bypass the eligibility route to create or replace files.

DROP POLICY IF EXISTS "student_documents_storage_insert_owner"
ON storage.objects;

DROP POLICY IF EXISTS "student_documents_storage_update_owner"
ON storage.objects;

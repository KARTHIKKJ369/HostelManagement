Unwanted files identified for removal (safe to delete)

This project is Node.js + Express with Supabase. The following files are temporary/debug utilities from earlier development and are not used by the running app. Server code does not import or mount them anymore.

Backend debug/temp scripts
- backend/allocate-karthik.js
- backend/check-karthik.js
- backend/debug-allotment.js
- backend/test-find-active.js
- backend/tmp_auth_test.js
- backend/tmp_inspect_table.js
- backend/tmp_scan_hashes.js
- backend/debug_scripts/tmp_auth_test.js
- backend/debug_scripts/tmp_inspect_table.js
- backend/debug_scripts/tmp_scan_hashes.js

Other obsolete artifacts
- requirements.txt (Python/Flask leftover, not used by this Node app)
- README references to Flask (already removed)

Kept (still useful)
- backend/create-superadmin.js: utility to bootstrap a superadmin user
- backend/fix-sequences.js: maintenance helper to fix DB sequences
- backend/truncate_all_tables.js: maintenance helper (use with caution)

Notes
- The Express server no longer mounts backend/routes/test.js, but the file remains. It can be deleted later; keeping it for now has no runtime effect.
- If you want to fully remove these files from git history, delete them and commit on main. For tracked files, .gitignore won’t remove them; you must delete and commit.

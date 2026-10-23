# Security Specification - OpenMap Studio

## Data Invariants
- A user document can only be created by the authenticated user with the matching UID.
- A user can only read and write their own user document.
- `subscriptionType` and `isActive` are protected fields that should ideally be updated by an admin or system (but for this demo, we'll allow the user to update them after "payment" to keep it simple, or restrict them if I follow the "Tenant/User Sub" logic strictly).
- Actually, the request says: "User must upload proof of payment documents then submit it.let there be a circle loading for 3 seconds."
- To follow the user's request, the activation feature is purely client-side for now, but I should protect the user data.

## The "Dirty Dozen" Payloads
1. Create user with different UID: `uid` in payload != `request.auth.uid` -> DENIED
2. Update someone else's user document -> DENIED
3. Read someone else's user document -> DENIED
4. Create user with invalid email format -> DENIED
5. Update `createdAt` field after creation -> DENIED
6. Create user without required `firstName` or `surname` -> DENIED
7. Inject 1MB string into `firstName` -> DENIED
8. Delete own user document (if not allowed) -> DENIED
9. Update `email` to an email not matching auth token -> DENIED
10. Set `isActive` to true without a valid system process (if restricted) -> DENIED
11. Add unknown fields to user document -> DENIED
12. Access database without being signed in -> DENIED

## Test Plan
- Verify that users can only access `users/$(request.auth.uid)`.
- Verify strict schema validation on create/update.

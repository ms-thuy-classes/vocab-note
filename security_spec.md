# Security Specification — Learn with Ms. Thúy - Vocabulary Note

## 1. Data Invariants
1. **PII & Profile Isolation**: A `UserProfile` document at `/users/{userId}` contains PII (`email`, `reminderEmail`) and may only be read (`get`), created, or updated by the verified authenticated user whose `request.auth.uid == userId`. Listing `/users` is strictly denied.
2. **Folder Ownership & Existence**: Every `TopicFolder` at `/users/{userId}/folders/{folderId}` must have `ownerId == request.auth.uid` and can only be created if the parent `/users/{userId}` document exists (`exists(...)` or `existsAfter(...)`).
3. **Word Relational Integrity**: Every `VocabWord` at `/users/{userId}/words/{wordId}` must have `ownerId == request.auth.uid` and reference a valid `folderId` that exists in `/users/{userId}/folders/{folderId}` (`existsAfter(...)` to support atomic batch seeding).
4. **Immutable Ownership & Server Timestamps**: `ownerId` and `createdAt` can never change after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
5. **Strict Payload Boundaries**: Every string, array, and enum is bounded by exact `maxLength`, `pattern`, and `.size()` checks matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Cross-User Profile Read**: User B attempts `get(/users/userA)` -> DENIED (`isOwner` fails).
2. **Users Collection Scraping**: Any user attempts `list(/users)` -> DENIED (`allow list: if false`).
3. **Unverified Email Write**: User with `email_verified: false` attempts to create `/users/userA` -> DENIED (`isVerifiedUser` fails).
4. **Identity Spoofing on Folder**: User B creates `/users/userB/folders/f1` with `ownerId: "userA"` -> DENIED (`ownerId == request.auth.uid` fails).
5. **Shadow Field Injection on Profile**: User A updates `/users/userA` adding `"isAdmin": true` -> DENIED (`affectedKeys().hasOnly(...)` & `keys().hasOnly(...)` fail).
6. **Orphaned Word Creation**: User A creates `/users/userA/words/w1` with `folderId: "nonexistent-folder"` -> DENIED (`existsAfter` fails).
7. **ID Poisoning**: User A attempts to create `/users/userA/folders/bad$id!with*invalid^chars` -> DENIED (`isValidId` regex fails).
8. **Timestamp Forgery**: User A creates a word with client-forged `createdAt: Timestamp(2020-01-01)` -> DENIED (`createdAt == request.time` fails).
9. **Immutable Field Mutation**: User A updates a word trying to mutate `ownerId` or `createdAt` -> DENIED (`affectedKeys().hasOnly(...)` and equality check fail).
10. **Denial-of-Wallet String Bloat**: User A creates a word with `english` length 5,000 chars -> DENIED (`english.size() <= 150` fails).
11. **Unbounded Array Attack**: User A creates a word with 500 items in `synonyms` -> DENIED (`synonyms.size() <= 15` fails).
12. **Type Poisoning**: User A updates `xp` to a string `"999999"` instead of number -> DENIED (`data.xp is number` fails).

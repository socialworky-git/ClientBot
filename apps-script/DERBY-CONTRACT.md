# Distortion Derby — Backend Contract

Deployed Apps Script endpoint:

```
https://script.google.com/macros/s/AKfycbxkyEWtb29QVp-JWFl9dZ889lMbRBHtVZlKHmZhbZvL8B-5lc4g4PPN-KQPSqPPhIWp/exec
```

---

## POST — record an event

Content-Type: `text/plain;charset=utf-8` (CORS-safelisted; no preflight).  
Body: JSON string.

```json
{
  "activityId": "distortion-derby",
  "teamId":     "<stable UUID per team, generated once and stored in localStorage>",
  "teamName":   "<human name the team typed>",
  "questionId": "<item id from items.json, or 'JOIN'>",
  "answered":   "<the label the team chose, or '' for JOIN>",
  "correct":    true,
  "eventId":    "<unique per-event UUID for dedup>"
}
```

Expected response: `{ "ok": true }`

The play app sends a `JOIN` row (questionId = "JOIN", answered = "", correct = false) when a team clicks "We're in". This is what puts the team on the board before they answer any questions.

---

## GET — leaderboard snapshot

No parameters required. Returns all event rows for the sheet.

Expected response shape:

```json
{
  "ok": true,
  "rows": [
    {
      "teamId":     "t_abc123",
      "teamName":   "Team Rocket",
      "questionId": "dd-07",
      "correct":    true,
      "ts":         "2026-09-22T14:03:11.000Z"
    }
  ]
}
```

---

## Leaderboard computation rules

These are the authoritative rules. If `board.html` disagrees with the prototype, the prototype is right.

1. **Group by `teamId`** (not `teamName` — a retyped name must not split the score).
2. **Correct count**: rows where `correct === true` and `questionId !== "JOIN"`.
3. **Sort**: descending by correct count; ties broken by each team's latest event timestamp ascending (finished earlier wins).
4. **Teams that have joined but not answered**: appear in the list with 0 correct. A team is "joined" if it has a JOIN row.
5. **Done**: a team is marked done when its correct + wrong answer count reaches 30 (total items).
6. **Skip JOIN rows** when counting correct answers.

---

## Sheet structure

The Apps Script writes one row per event to a Google Sheet named **Events**:

| timestamp | activityId | teamId | teamName | questionId | answered | correct | eventId |
|-----------|------------|--------|----------|------------|----------|---------|---------|

Deduplication is on `eventId` — if the same eventId appears twice (client retry), the script discards the duplicate.

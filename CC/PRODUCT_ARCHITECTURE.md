# Curated Connections™ — Product Architecture Decisions
## Captured May 11, 2026

---

## CARD ACTIONS — THREE DESTINATIONS

Every card in the system has three actions via a three-dot menu:

### 1. Share a Card
"I thought of you when I read this. How would you answer it?"
- Just curiosity. Just connection.
- No account needed for recipient
- They answer, you see it, maybe you have a conversation
- No archive, no leaf, no program required

### 2. Reflection
"I want to know how you see me."
- You send a card about YOURSELF to someone else
- They answer it about YOU
- Goes into YOUR leaf
- The mirror — how do others experience me?

### 3. Tribute
"I want to know how you see them."
- You send a card about SOMEONE ELSE to a third person
- They answer it about THAT PERSON
- Goes into THAT PERSON'S leaf
- Example: asking a teacher/coworker/friend about your daughter

### Key Rules:
- Reflection Requests go to ANYONE — Circle member or not
- Recipient needs no account — just a link
- Recipient sees: "[Name] thought of you and wanted to hear your answer."
- After answering they see: "Thank you. This has been added to [Name]'s story."
- Optional gentle invite to join CC after answering

---

## CARD CONTENT FIELDS NEEDED (add to ALL content tables)

- Mirror Version — same question rewritten for someone else
- Destinations — multi-select: Feed, Leaf, Share, Reflection, Tribute, All

---

## LIVING LEGACY — LEAF ARCHITECTURE

### Life in Bloom™
- Birth to 12 months: monthly prompts
- Years 2-5: quarterly prompts  
- Years 6-12: every 6 months
- Years 13-18: yearly
- Contributors: family members, not just parents

### Adult Chapter (18-28)
- 18-22: every 6 months — Finding footing
- 22-25: yearly — Becoming
- 25-28: yearly — Settling
- Child becomes a contributor answering for themselves
- Archive shifts from others' memories TO their own voice

### Reflection Circle
- Send Tribute cards to anyone in child's world — teacher, coach, friend, coworker
- No Circle access needed — works via leaf only
- Keeper reviews before adding to leaf permanently
- Contributor gets simple link, no account needed

---

## CIRCLES — BIRTHDAY & EVENTS ENGINE

### How birthdays get in:
1. You add it — you know it, you enter it
2. You request it — app sends gentle ask to that person
3. They add it themselves — optional when joining Circle

### Celebration types per person:
- Birthday
- Anniversary  
- Milestone (graduation, new job, new baby)
- Remembrance (someone who has passed)
- Just because

### What happens automatically:
- 7 days out: quietly builds the deck in background
- 3 days out: gentle nudge to Circle members
- Day of: personalized deck appears in Circle feed
- No two Circles ever see the same combination
- Relationship type + history + season all factor in

---

## LIFE EVENTS — RELATIONSHIP TIMELINE

### How events get logged:
1. You add manually — person, event type, date (15 seconds)
2. In-feed recognition — someone posts "We're engaged!" → app offers to log it
3. (Phase 3) Share Sheet — native app only

### Event types:
- Birthday, Anniversary, Graduation, Wedding, New Baby
- New Job, Moving, Loss, Illness, Recovery, Just Because

### What the timeline does:
- Surfaces moments at the right time — 2 weeks out, 3 days out, morning of
- Triggers right card deck for each event type
- Lets Circle members contribute before the day
- Creates a memory capture after

---

## CAMPAIGN CALENDAR — ANNUAL RECURRING

| Holiday | Date | Code | Page |
|---|---|---|---|
| Mother's Day | May 2nd Sunday | MOTHERS[YEAR] | /mothers-day.html |
| Father's Day | June 3rd Sunday | FATHERS[YEAR] | /fathers-day.html |
| Grandparents Day | Sept 1st Sunday | GRANDPARENTS[YEAR] | /grandparents-day.html |
| Siblings Day | April 10 | SIBLINGS[YEAR] | /siblings-day.html |
| Memorial Day | May last Monday | REMEMBER[YEAR] | /memorial-day.html |
| New Baby / Shower | Ongoing | NEWLEAF[YEAR] | /new-baby.html |
| Christmas / Gift | December 25 | GIFT[YEAR] | /gift-a-leaf.html |
| New Year | January 1 | LEGACY[YEAR] | /new-year.html |

All pages same emotional structure as mothers-day.html.
Update year and promo code each January. Recycle forever.

---

## STRIPE PROMO CODES TO CREATE

All = 100% off first payment, once, free leaf through Dec 31 of that year

- MOTHERS2026
- FATHERS2026  
- GRANDPARENTS2026
- SIBLINGS2027
- REMEMBER2026
- NEWLEAF2026
- GIFT2026
- LEGACY2026
- FOUNDER2026 (free leaf + Connect tier 3 months free)

---

## VIRAL GROWTH ENGINE

Every Reflection / Tribute sent = potential new user
Recipient experiences product at its most emotional BEFORE signing up
After answering: gentle invite to explore CC for their own people
No ads needed — product markets itself through moments it creates

---

## PAGES TO BUILD

Done:
- index.html
- gather.html  
- legacy.html (+ FamilySearch + GEDCOM)
- mothers-day.html
- campaign-videos.html
- fathers-day.html

In progress:
- grandparents-day.html
- siblings-day.html
- memorial-day.html
- new-baby.html
- gift-a-leaf.html
- new-year.html

Planned:
- Life in Bloom landing page
- Adult Chapter landing page
- Tribute/Reflection send flow
- Circle relationship timeline view

---

## AIRTABLE TABLES TO ADD/UPDATE

New tables needed:
- Life in Bloom Milestones (age-specific prompts, 200+ cards)
- Adult Chapter Prompts (18-28, ~60 cards)
- Reflection/Tribute Cards (mirror versions, ~100 cards)
- Circle Events (birthday, anniversary, milestones)
- Tribute Requests (tracking who was asked what about whom)

Fields to add to ALL content tables:
- Mirror Version (multiline text)
- Destinations (multi-select: Feed, Leaf, Share, Reflection, Tribute)

---

*© 2026 RespondIQ LLC · Curated Connections™*
*For internal product reference only*

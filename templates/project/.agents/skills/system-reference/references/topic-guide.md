# Topic guide

Use the configured topic map, recording an omission reason for inapplicable topics.

| Topic | Questions the reader must be able to answer |
| --- | --- |
| Context and architecture | What does the system do? Who uses it? Which process owns each decision? Where are trust and repository boundaries? |
| Domain model | Which concepts differ despite similar names? What is identity versus version, intent versus evidence, authority versus projection? |
| Workflow and state | What triggers a transition? What preconditions and permissions apply? What invalidates dependent work? |
| Relational model | Which keys and constraints enforce relationships? What is deliberately derived/denormalized? What is outside a transaction? |
| API | Which caller uses which contract? Are route declarations complete? How do errors, retries and pagination work? |
| Operations | How does readiness differ from health? Who owns recovery, credentials, retention and restore? Which claims were executed? |
| Codebase | Where are the entry points and verification seams? Which dependencies/generated outputs are excluded? |
| Worked example | Can one coherent synthetic input be followed through the system, including conflict/failure and recovery? |

For a domain concept, explain meaning, relationships, authority and an example before implementation detail. For a behavior, cite entry points and enforcement, not only a comment. For a diagram, explain arrow meanings and relevant omissions in adjacent prose. Keep one current factual account and link historical/planned records with their status.

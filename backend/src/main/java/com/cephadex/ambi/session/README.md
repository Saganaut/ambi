# A deckRun is a one time session of the deck, this can be a

- presentation
- game

## We are using DDD light for this feature, with the following notes

- LiveSession.java, Answer.java, Participant.java are both the domain class and the document
- This is in order to avoid ambiguity and because their primary role is to enforce rules tied to the session
- but they also need to persist as documents in MongoDb
- They should not inherit the document base class, they should have custom setters to maintain invariance
- Round.java does not have a persistent document, it is initialized from a slide within a deck snapshot
- LiveSession is the aggregate for participant.java, , and round.java as well as the liveSession itself
- answer.java is governed by the aggregate rules, its only role is to submit answers. Checks for correctness/scoring are done in Round.java
- Participant.java has mutable fields, the scoring ones.
- Round results round is computed from Answers which remain the source of truth
- LiveSessionOrchestrator.java will manage it all

## Redis is runtime store, mongodb projection to durable history

- All reads should be on redis during session
- Only writes to mongodb, but we do so continuously - can be used for recovery in case of redis failure
- Writes to mongo db take place at the end of each round, when a player joins, and at the end of the game

## Locks, all changes must be done with a lock on that redis session

## Projectors

- RoundResultProjector - Projects to first then mongodb
- SessionLifecycleProjector - Projects to mongodb for persistence
  - also projects participants joined
  -

## Infrastructure

- EventPublisher
- AnswerStore
- SessionLocks
- PresenceStore
- TallyStore
- LiveSessionRepository
- RoundRepository
- ParticipantRepository
- AnswerRepository
- RoundResultRepository

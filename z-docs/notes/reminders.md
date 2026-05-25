## MongoDB Access

To access the MongoDB shell when running via Docker Compose:

```bash
docker exec -it brainflex-mongodb-1 mongosh -u admin -p password
```

Useful MongoDB commands:

- Show databases: `show dbs`
- Use a database: `use brainflex`
- Show collections: `show collections`
- Find documents: `db.collection.find()`
- Insert a document: `db.collection.insertOne({ key: 'value' })`

## JAVA TESTS

Less verbose tests
./mvnw test -q

With logs
./mvn test > test-output.log

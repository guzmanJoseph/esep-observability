
const express = require('express');
const { MongoClient } = require('mongodb');
const { trace } = require('@opentelemetry/api');

const app = express();
const tracer = trace.getTracer('todo-app');
const mongoClient = new MongoClient('mongodb://localhost:27017');

async function startServer() {
  await mongoClient.connect();
  console.log('Connected to MongoDB');

  const db = mongoClient.db('observability');
  const todos = db.collection('todos');

  if (await todos.countDocuments() === 0) {
    await todos.insertMany([
      { task: 'Complete A9 Observability', completed: false },
      { task: 'Review OpenTelemetry traces', completed: false },
      { task: 'Submit assignment PDF', completed: false }
    ]);
  }

  app.get('/todo', async (req, res) => {
    const span = tracer.startSpan('fetch-todo-items');

    try {
      const items = await todos.find({}).toArray();
      span.setAttribute('todo.count', items.length);

      console.log(`GET /todo - returned ${items.length} items`);
      res.json(items);
    } catch (error) {
      span.recordException(error);
      res.status(500).json({ error: 'Failed to load todos' });
    } finally {
      span.end();
    }
  });

  app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
  });
}

startServer().catch(console.error);

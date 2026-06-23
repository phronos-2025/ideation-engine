import { serve } from '@hono/node-server';
import { createActions } from '@phronos/core';
import { createDb } from '@phronos/db';
import { createApp } from './app.js';
import { env } from './env.js';

const { db } = createDb(env.databaseUrl());
const actions = createActions(db);
const app = createApp(actions);
const port = env.port();

serve({ fetch: app.fetch, port });
console.log(`Phronos API listening on :${port}`);

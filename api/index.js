import 'dotenv/config';
import { createServer } from '../src/server.js';

const app = createServer();

export default function handler(req, res) {
  return app(req, res);
}

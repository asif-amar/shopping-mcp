import cors from 'cors';

export const corsOptions = cors({
  origin: [
    'chrome-extension://*',
    'moz-extension://*',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});
import { kv } from '@vercel/kv';

const DEFAULT_SETTINGS = { countries: [], year: new Date().getFullYear() };

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const settings = (await kv.get('lp_settings')) ?? DEFAULT_SETTINGS;
      return res.status(200).json(settings);
    } catch (error) {
      console.error('KV read failed:', error);
      return res.status(500).json({ error: 'Failed to load data' });
    }
  }
  if (req.method === 'POST') {
    const settings = req.body;
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Body must be an object' });
    }
    try {
      await kv.set('lp_settings', settings);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('KV write failed:', error);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

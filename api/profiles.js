import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const profiles = (await kv.get('lp_profiles')) ?? [];
      return res.status(200).json(profiles);
    } catch (error) {
      console.error('KV read failed:', error);
      return res.status(500).json({ error: 'Failed to load data' });
    }
  }
  if (req.method === 'POST') {
    const profiles = req.body;
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    try {
      await kv.set('lp_profiles', profiles);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('KV write failed:', error);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

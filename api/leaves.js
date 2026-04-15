import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const leaves = (await kv.get('lp_leaves')) ?? [];
      return res.status(200).json(leaves);
    } catch (error) {
      console.error('KV read failed:', error);
      return res.status(500).json({ error: 'Failed to load data' });
    }
  }
  if (req.method === 'POST') {
    const leaves = req.body;
    if (!Array.isArray(leaves)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    try {
      await kv.set('lp_leaves', leaves);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('KV write failed:', error);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

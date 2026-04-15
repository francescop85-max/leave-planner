import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const leaves = (await kv.get('lp_leaves')) ?? [];
    return res.status(200).json(leaves);
  }
  if (req.method === 'POST') {
    const leaves = req.body;
    if (!Array.isArray(leaves)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    await kv.set('lp_leaves', leaves);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

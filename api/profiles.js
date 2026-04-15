import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const profiles = (await kv.get('lp_profiles')) ?? [];
    return res.status(200).json(profiles);
  }
  if (req.method === 'POST') {
    const profiles = req.body;
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    await kv.set('lp_profiles', profiles);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

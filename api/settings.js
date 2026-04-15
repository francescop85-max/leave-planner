import { kv } from '@vercel/kv';

const DEFAULT_SETTINGS = { countries: [], year: new Date().getFullYear() };

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = (await kv.get('lp_settings')) ?? DEFAULT_SETTINGS;
    return res.status(200).json(settings);
  }
  if (req.method === 'POST') {
    const settings = req.body;
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Body must be an object' });
    }
    await kv.set('lp_settings', settings);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

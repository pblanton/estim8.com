import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import * as cardDeckRepo from '../repositories/cardDeckRepo.js';

export const cardDeckRouter = Router();

cardDeckRouter.get('/', requireAuth, async (req, res) => {
  const decks = await cardDeckRepo.listDecksForUser(req.user!.id);
  res.json({ decks });
});

cardDeckRouter.post('/', requireAuth, async (req, res) => {
  const { name, labels } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || !Array.isArray(labels) || labels.length === 0) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Name and at least one label are required' } });
    return;
  }
  const cleanLabels = labels.map((l) => String(l).trim()).filter(Boolean);
  const deck = await cardDeckRepo.createCustomDeck(req.user!.id, name.trim(), cleanLabels);
  res.status(201).json({ deck });
});

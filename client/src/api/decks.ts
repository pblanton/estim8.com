import { api } from './client';

export interface CardDeck {
  id: string;
  owner_id: string | null;
  name: string;
  type: 'fibonacci' | 'decimal' | 'custom';
  labels: string[];
  is_system: boolean;
}

export const deckApi = {
  list: () => api.get<{ decks: CardDeck[] }>('/card-decks'),
  create: (name: string, labels: string[]) => api.post<{ deck: CardDeck }>('/card-decks', { name, labels }),
};

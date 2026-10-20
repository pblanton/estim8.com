INSERT INTO card_decks (id, owner_id, name, type, labels, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Fibonacci', 'fibonacci',
   JSON_ARRAY('0', '1', '2', '3', '5', '8', '13', '21', '34', '?'), TRUE),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Decimal', 'decimal',
   JSON_ARRAY('0', '0.5', '1', '1.5', '2', '3', '5', '8', '13', '?'), TRUE),
  ('00000000-0000-0000-0000-000000000003', NULL, 'T-Shirt Sizes', 'custom',
   JSON_ARRAY('XS', 'S', 'M', 'L', 'XL', 'XXL', '?'), TRUE);

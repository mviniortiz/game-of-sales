-- V1.0.1 — Linka 2 deals a 2 conversas reais demo seed pra ter material
-- demonstrável no DealCommandCenter (passos 13-15 do roteiro).
-- Reversible: substituir customer_name/title/customer_phone pelos originais
-- e setar deal_id=NULL nas 2 convs.

BEGIN;

-- Deal 1: Mayara Sampaio
UPDATE deals
   SET customer_name = 'Mayara Sampaio',
       customer_phone = '5521987283195',
       title = 'Tráfego Meta — Mayara Sampaio (Odonto Prime)',
       notes = 'Lead da Odonto Prime. Demo seed v1 (V1.0.1).'
 WHERE id = '268b98da-2d69-43a7-9898-ea0460c8a203'
   AND company_id = '00000000-0000-0000-0000-000000000001';

UPDATE channel_conversations
   SET deal_id = '268b98da-2d69-43a7-9898-ea0460c8a203'
 WHERE id = '0fb46a50-f29f-4225-be2f-19a64e418ae2'
   AND company_id = '00000000-0000-0000-0000-000000000001';

-- Deal 2: Jean Spinola
UPDATE deals
   SET customer_name = 'Jean Spinola',
       customer_phone = '5521965036551',
       title = 'Tráfego — Jean Spinola (Franquia Local)',
       notes = 'Lead franquia local. Demo seed v1 (V1.0.1).'
 WHERE id = '97d9397b-a2e9-45e4-94c3-5a507b7fe361'
   AND company_id = '00000000-0000-0000-0000-000000000001';

UPDATE channel_conversations
   SET deal_id = '97d9397b-a2e9-45e4-94c3-5a507b7fe361'
 WHERE id = '6f62e000-72de-48b0-80e9-a4873f06c268'
   AND company_id = '00000000-0000-0000-0000-000000000001';

-- Confirmação
SELECT
    d.id AS deal_id,
    d.title,
    d.customer_name,
    d.customer_phone,
    d.stage,
    cv.id AS conversation_id,
    ct.name AS contact_name,
    (SELECT count(*) FROM channel_messages WHERE conversation_id = cv.id) AS msg_count
FROM deals d
JOIN channel_conversations cv ON cv.deal_id = d.id
JOIN channel_contacts ct ON ct.id = cv.contact_id
WHERE d.id IN (
    '268b98da-2d69-43a7-9898-ea0460c8a203',
    '97d9397b-a2e9-45e4-94c3-5a507b7fe361'
)
ORDER BY d.id;

COMMIT;

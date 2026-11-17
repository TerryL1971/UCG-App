import { SUPPORT_WHATSAPP, whatsappChatUrl } from '@/constants/ucg-info';
import type { Deal } from '@/lib/deals';
import { openUrlWithFeedback } from '@/lib/linking';

/**
 * WhatsApp is how UCG and the customer talk (Terry, 2026-11-17): no UCG
 * employee logs into the app, so every "message my salesperson" opens
 * WhatsApp with the message already written, including the Deal # so the
 * salesperson knows which deal it's about.
 *
 * This is the one deliberate exception to "keep the customer inside the
 * app": conversations with UCG happen in WhatsApp.
 */

/** The salesperson's WhatsApp, or UCG's general WhatsApp inbox when the
 * customer hasn't added one. */
export function salespersonNumber(deal: Pick<Deal, 'salesperson_whatsapp'> | null | undefined): string {
  return deal?.salesperson_whatsapp || SUPPORT_WHATSAPP;
}

export function salespersonLabel(deal: Pick<Deal, 'salesperson_name' | 'salesperson_whatsapp'> | null | undefined): string {
  if (deal?.salesperson_whatsapp) return deal.salesperson_name?.split(' ')[0] || 'my salesperson';
  return 'UCG';
}

/** Opens WhatsApp to the deal's salesperson with `text` ready to send.
 * The Deal # is added in front so the salesperson can find it. */
export function messageSalesperson(deal: Deal | null | undefined, text: string): Promise<void> {
  const prefix = deal ? `Deal #${deal.deal_number} (${deal.stock_number}): ` : '';
  return openUrlWithFeedback(
    whatsappChatUrl(salespersonNumber(deal), `${prefix}${text}`),
    "Couldn't open WhatsApp. Make sure it's installed, then try again. Your message wasn't sent.",
  );
}

/** A message to UCG in general (e.g. an American Auto Nation quote). */
export function messageUcg(text: string): Promise<void> {
  return openUrlWithFeedback(
    whatsappChatUrl(SUPPORT_WHATSAPP, text),
    "Couldn't open WhatsApp. Make sure it's installed, then try again. Your message wasn't sent.",
  );
}

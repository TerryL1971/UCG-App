import { Alert } from 'react-native';

import { SUPPORT_WHATSAPP, whatsappChatUrl } from '@/constants/ucg-info';
import type { Deal } from '@/lib/deals';
import { isDemoMode } from '@/lib/demo-mode';
import { openUrlWithFeedback } from '@/lib/linking';

const OPEN_FAILED = "Couldn't open WhatsApp. Make sure it's installed, then try again. Your message wasn't sent.";

/**
 * Opens WhatsApp — except in demo mode, where it first shows what would
 * be sent (Terry, 2026-11-18: demoing to the owners must never message a
 * real UCG inbox by accident; demo deals have no salesperson number, so
 * they'd go to UCG's general WhatsApp).
 */
function openWhatsApp(number: string, text: string, who: string): Promise<void> {
  const url = whatsappChatUrl(number, text);
  if (!isDemoMode()) return openUrlWithFeedback(url, OPEN_FAILED);
  return new Promise((resolve) => {
    Alert.alert(`Demo: WhatsApp to ${who}`, `In the real app this opens WhatsApp with this message ready to send:\n\n"${text}"`, [
      { text: 'OK', style: 'cancel', onPress: () => resolve() },
      { text: 'Open WhatsApp anyway', onPress: () => openUrlWithFeedback(url, OPEN_FAILED).then(resolve) },
    ]);
  });
}

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
  const who = deal?.salesperson_whatsapp ? (deal.salesperson_name ?? 'your salesperson') : 'UCG';
  return openWhatsApp(salespersonNumber(deal), `${prefix}${text}`, who);
}

/** A message to UCG in general (e.g. an American Auto Nation quote). */
export function messageUcg(text: string): Promise<void> {
  return openWhatsApp(SUPPORT_WHATSAPP, text, 'UCG');
}

/** A message to a specific person's WhatsApp, or UCG's general inbox when
 * there's no number yet (e.g. a wish list before a salesperson is known). */
export function messageWhatsapp(number: string | null | undefined, text: string, who: string): Promise<void> {
  return openWhatsApp(number || SUPPORT_WHATSAPP, text, number ? who : 'UCG');
}

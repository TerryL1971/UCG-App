import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDemoMode } from '@/lib/demo-mode';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * The customer's wish list before they've bought (Terry, 2026-11-18): in
 * a real conversation the customer's list vanished with a disappearing
 * WhatsApp chat. Kept here instead — on the account when logged in, so it
 * follows them to a new phone — and sent to UCG on WhatsApp.
 */
export interface WishList {
  arrival: string; // yyyy-mm-dd or ''
  transmission: 'automatic' | 'manual' | 'either';
  budget: string; // e.g. "$350/month" or "$20,000"
  size: string; // e.g. "Small SUV (like a VW Tiguan)"
  needs: string; // e.g. "toddler car seat"
  payment: 'cash' | 'loan' | 'unsure';
  dealership: string | null;
  salespersonName: string;
  salespersonWhatsapp: string; // digits, or ''
  notes: string;
  updatedAt: string;
}

export const EMPTY_WISH_LIST: WishList = {
  arrival: '',
  transmission: 'automatic',
  budget: '',
  size: '',
  needs: '',
  payment: 'unsure',
  dealership: null,
  salespersonName: '',
  salespersonWhatsapp: '',
  notes: '',
  updatedAt: '',
};

const KEY = 'ucg.wishList';

function onAccount(): boolean {
  return isSupabaseConfigured && Boolean(supabase) && !isDemoMode();
}

export async function loadWishList(): Promise<WishList> {
  try {
    if (onAccount() && supabase) {
      const { data } = await supabase.auth.getUser();
      const saved = data.user?.user_metadata?.wish_list as Partial<WishList> | undefined;
      if (saved) return { ...EMPTY_WISH_LIST, ...saved };
    }
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY_WISH_LIST, ...(JSON.parse(raw) as Partial<WishList>) } : EMPTY_WISH_LIST;
  } catch {
    return EMPTY_WISH_LIST;
  }
}

export async function saveWishList(list: WishList): Promise<void> {
  const next = { ...list, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  if (onAccount() && supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { error } = await supabase.auth.updateUser({ data: { wish_list: next } });
      if (error) throw error;
    }
  }
}

/** The WhatsApp message for the salesperson. */
export function wishListMessage(list: WishList, base: string | null, name: string | null): string {
  const lines = [
    `Hi${list.salespersonName ? ` ${list.salespersonName.split(' ')[0]}` : ''}! ${name ? `This is ${name}. ` : ''}Here's what I'm looking for:`,
    list.arrival ? `Arriving in Germany: ${list.arrival}` : '',
    base ? `Stationed at: ${base}` : '',
    `Transmission: ${list.transmission === 'either' ? 'either is fine' : list.transmission}`,
    list.budget ? `Budget: ${list.budget}` : '',
    list.size ? `Size: ${list.size}` : '',
    list.needs ? `Must have: ${list.needs}` : '',
    `Paying: ${list.payment === 'cash' ? 'myself (cash/wire)' : list.payment === 'loan' ? 'with a loan' : 'not sure yet'}`,
    list.notes ? `Notes: ${list.notes}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

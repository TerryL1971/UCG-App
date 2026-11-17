-- Insurance is its own roadmap step (Terry, 2026-11-17): the customer
-- starts insurance as soon as they send the wire or their loan is
-- complete — American Auto Nation (UCG's own) suggested first. Done when
-- the customer ticks "My car is insured" or adds their insurance card.

alter table public.deal_milestones drop constraint if exists deal_milestones_milestone_check;
alter table public.deal_milestones add constraint deal_milestones_milestone_check check (milestone in (
  'retail_ready', 'paid_in_full', 'insured', 'customs_cleared', 'tuv_release', 'registration_packet',
  'delivered', 'vehicle_received', 'deregistered', 'paid_out'
));

alter table public.deal_files drop constraint if exists deal_files_doc_type_check;
alter table public.deal_files add constraint deal_files_doc_type_check check (doc_type in (
  'purchase_order', 'cost_estimate', 'bill_of_sale', 'warranty_certificate', 'hand_over',
  'ae550a', 'ae550a_stamped', 'ae550b', 'ae550b_stamped',
  'vat_form', 'cashiers_check', 'loan_approval', 'tuv', 'insurance',
  'tt_doc', 'registration', 'title', 'lien_release', 'payoff_letter', 'registration_memo',
  'deregistration', 'license', 'other'
));

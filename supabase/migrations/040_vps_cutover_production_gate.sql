insert into public.production_gate_decisions (gate_key, label, owner, status, evidence_required, metadata)
values
  (
    'trustgraph_vps_cutover',
    'TrustGraph VPS cutover',
    'Infrastructure operator',
    'external_signoff_required',
    'TrustGraph VPS host, TLS, environment secrets, Supabase redirect URLs, and VFIX isolation verified before production cutover.',
    jsonb_build_object(
      'production_gate', true,
      'source', 'vps_launch',
      'trustgraph_host', 'https://trustgraph.5-75-224-110.sslip.io',
      'protected_vfix_host', 'https://5-75-224-110.sslip.io'
    )
  )
on conflict (gate_key)
do update set
  label = excluded.label,
  owner = excluded.owner,
  evidence_required = excluded.evidence_required,
  metadata = public.production_gate_decisions.metadata || excluded.metadata,
  updated_at = now();

create or replace function public.mark_notification_event_status(
  target_notification_id uuid,
  next_status notification_event_status
)
returns public.notification_events
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  notification_row public.notification_events;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if next_status not in ('delivered', 'suppressed') then
    raise exception 'Notification status must be delivered or suppressed';
  end if;

  select *
    into notification_row
  from public.notification_events
  where id = target_notification_id;

  if not found then
    raise exception 'Notification not found';
  end if;

  if notification_row.recipient_profile_id <> current_id
    and (notification_row.organization_id is null or not public.has_active_membership(notification_row.organization_id)) then
    raise exception 'Notification recipient or organization membership required';
  end if;

  update public.notification_events
  set status = next_status
  where id = target_notification_id
  returning * into notification_row;

  perform public.write_audit_event(
    'notification.status_changed',
    'notification_events',
    notification_row.id,
    notification_row.organization_id,
    'Notification status changed from app inbox',
    jsonb_build_object('status', next_status)
  );

  return notification_row;
end;
$$;

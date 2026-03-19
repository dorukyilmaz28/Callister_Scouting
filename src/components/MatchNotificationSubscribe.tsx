"use client";

type Props = {
  eventId: string;
  eventName?: string | null;
  hasAssignedTeams: boolean;
};

/** Sadece maç bildirimleri açıklaması (buton kaldırıldı). */
export function MatchNotificationSubscribe({
  eventId: _eventId,
  eventName: _eventName,
  hasAssignedTeams: _hasAssignedTeams,
}: Props) {
  // Kullanıcı isteği doğrultusunda bildirim açıklama bloğunu tamamen kaldırıyoruz.
  return null;
}

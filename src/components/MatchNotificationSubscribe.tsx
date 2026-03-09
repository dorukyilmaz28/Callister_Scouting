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
  return (
    <div className="card p-4 border-[#6366f1]/30">
      <h3 className="font-semibold text-[#e0e7ff] mb-1">Maç bildirimleri</h3>
      <p className="text-sm text-[#e0e7ff]/70 mb-2">
        Atadığınız takımın maçı yaklaşınca (2 maç sonra, 1 maç kala, sıradaki maç) bildirim alabilirsiniz.
      </p>
      <p className="text-sm text-amber-200/90">
        Bildirimlerin gelmesi için tarayıcıda bildirim izni vermeniz ve mobilde uygulamayı ana ekrana eklemeniz gerekir (Safari: Paylaş → Ana Ekrana Ekle; Chrome: Menü → Ana ekrana ekle).
      </p>
    </div>
  );
}

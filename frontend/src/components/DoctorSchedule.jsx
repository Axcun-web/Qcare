import "./DoctorSchedule.css";

const DAYS = [
  { value: "SENIN", label: "Senin" },
  { value: "SELASA", label: "Selasa" },
  { value: "RABU", label: "Rabu" },
  { value: "KAMIS", label: "Kamis" },
  { value: "JUMAT", label: "Jumat" },
  { value: "SABTU", label: "Sabtu" },
  { value: "MINGGU", label: "Minggu" },
];

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

/**
 * Read-only weekly schedule view for one doctor (Admin-facing: view only).
 * Renders the same day-list visual as DoctorScheduleEditor but with no
 * add/edit/delete affordances and no API calls of its own.
 *
 * For an editable version (Petugas-facing), use `DoctorScheduleEditor`.
 */
export default function DoctorSchedule({ doctor }) {
  return (
    <div className="day-list">
      {DAYS.map((d) => {
        const slot = doctor.jadwalPraktik.find((s) => s.hari === d.value);
        return (
          <div
            className={`day-row${slot ? "" : " day-row--off"}`}
            key={d.value}
          >
            <div className="day-row-label">{d.label}</div>
            <div className="day-row-info">
              {slot ? (
                <>
                  <span className="day-time">
                    {formatTime(slot.jamMulai)}–{formatTime(slot.jamSelesai)}
                  </span>
                  <span className="day-quota">Kuota {slot.kuotaAntrean}</span>
                </>
              ) : (
                <span className="day-off-label">Libur</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DAYS };

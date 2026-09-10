import { useState } from "react";
import { api } from "../lib/api";
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
    hour12: false
  });

const toHHMM = (value) => {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
};

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M18 7l-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function SlotForm({ initial, onCancel, onSubmit }) {
  return (
    <form className="slot-form" onSubmit={onSubmit}>
      <div className="slot-form-fields">
        <label>
          Jam mulai
          <input
            name="jamMulai"
            type="time"
            defaultValue={initial?.jamMulai}
            required
          />
        </label>
        <label>
          Jam selesai
          <input
            name="jamSelesai"
            type="time"
            defaultValue={initial?.jamSelesai}
            required
          />
        </label>
        <label>
          Kuota
          <input
            name="kuotaAntrean"
            type="number"
            min="1"
            defaultValue={initial?.kuotaAntrean ?? 20}
            required
          />
        </label>
      </div>
      <div className="slot-form-actions">
        <button type="button" className="slot-cancel" onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className="slot-save">
          Simpan
        </button>
      </div>
    </form>
  );
}

/**
 * Weekly schedule editor for one doctor (Petugas-facing: view AND edit).
 * Self-contained CRUD against /admin/doctors/:id/jadwal and
 * /admin/jadwal/:id; calls onChange() after any successful mutation so the
 * parent can refetch the owning clinic/doctor data.
 *
 * For a read-only view (Admin-facing), use `DoctorSchedule` instead.
 */
export default function DoctorScheduleEditor({ doctor, clinicHours, onChange, onError }) {
  const [addingDay, setAddingDay] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const validateHours = (start, end) => {
    if (!clinicHours) return true;
    const parts = clinicHours.split("-");
    if (parts.length === 2) {
      const cStart = parts[0].trim();
      const cEnd = parts[1].trim();
      if (start < cStart || end > cEnd) {
        throw new Error(`Jadwal praktik (${start} - ${end}) di luar jam operasional klinik (${clinicHours})`);
      }
    }
    return true;
  };

  const submitAdd = async (e, hari) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      validateHours(data.jamMulai, data.jamSelesai);
        
      await api(`/admin/doctors/${doctor.id}/jadwal`, {
        method: "POST",
        body: JSON.stringify({ hari, ...data }),
      });
      setAddingDay(null);
      await onChange();
    } catch (err) {
      onError(err.message);
    }
  };

  const submitEdit = async (e, slotId, hari) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      validateHours(data.jamMulai, data.jamSelesai);

      await api(`/admin/jadwal/${slotId}`, {
        method: "PATCH",
        body: JSON.stringify({ hari, ...data }),
      });
      setEditingId(null);
      await onChange();
    } catch (err) {
      onError(err.message);
    }
  };

  const deleteJadwal = async (slotId) => {
    if (!window.confirm("Hapus jadwal ini?")) return;
    try {
      await api(`/admin/jadwal/${slotId}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="day-list">
      {DAYS.map((d) => {
        const slot = doctor.jadwalPraktik.find((s) => s.hari === d.value);
        const isEditing = slot && editingId === slot.id;
        const isAdding = !slot && addingDay === d.value;

        return (
          <div
            className={`day-row${slot ? "" : " day-row--off"}`}
            key={d.value}
          >
            <div className="day-row-label">{d.label}</div>

            {isEditing && (
              <SlotForm
                initial={{
                  jamMulai: toHHMM(slot.jamMulai),
                  jamSelesai: toHHMM(slot.jamSelesai),
                  kuotaAntrean: slot.kuotaAntrean,
                }}
                onCancel={() => setEditingId(null)}
                onSubmit={(e) => submitEdit(e, slot.id, d.value)}
              />
            )}

            {isAdding && (
              <SlotForm
                onCancel={() => setAddingDay(null)}
                onSubmit={(e) => submitAdd(e, d.value)}
              />
            )}

            {!isEditing && !isAdding && slot && (
              <div className="day-row-info">
                <span className="day-time">
                  {formatTime(slot.jamMulai)}–{formatTime(slot.jamSelesai)}
                </span>
                <span className="day-quota">Kuota {slot.kuotaAntrean}</span>
                <div className="day-row-actions">
                  <button
                    type="button"
                    aria-label={`Edit jadwal ${d.label}`}
                    onClick={() => setEditingId(slot.id)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    aria-label={`Hapus jadwal ${d.label}`}
                    onClick={() => deleteJadwal(slot.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}

            {!isEditing && !isAdding && !slot && (
              <div className="day-row-info">
                <span className="day-off-label">Libur</span>
                <button
                  type="button"
                  className="day-add-btn"
                  onClick={() => setAddingDay(d.value)}
                >
                  <PlusIcon /> Tambah
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { DAYS };

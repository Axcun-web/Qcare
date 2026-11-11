/**
 * Logout asks for confirmation first (Use Case Description Logout,
 * Tabel 3.23 skripsi). Returns true when the user confirms.
 */
export const confirmLogout = () =>
  window.confirm("Apakah Anda yakin ingin keluar dari akun ini?");

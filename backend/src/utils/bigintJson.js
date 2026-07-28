/**
 * `JSON.stringify` tidak mendukung tipe BigInt secara native, sedangkan
 * seluruh primary key pada skema Qcare memakai BigInt (sesuai ERD Bab 3).
 * Modul ini diimpor sebagai side-effect pada app.js agar setiap ID
 * diserialisasi menjadi string pada response API.
 */
// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function toJSON() {
  return this.toString();
};

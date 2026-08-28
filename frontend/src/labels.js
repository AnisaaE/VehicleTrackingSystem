export const roleLabels = {
  ADMIN: 'Yönetici',
  DISPATCHER: 'Sevk Görevlisi',
  DRIVER: 'Şoför',
  VIEWER: 'İzleyici'
};

export const tripStatusLabels = {
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'Devam ediyor',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi'
};

export function formatRoleLabel(role) {
  return roleLabels[role] ?? role ?? '-';
}

export function formatTripStatusLabel(status) {
  return tripStatusLabels[status] ?? status ?? '-';
}

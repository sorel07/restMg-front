export const formatCOP = (price: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price);
};

-- Fix: fuel_summary excluía las cargas sin km del total de costo/litros,
-- haciendo que el Gasto Total del vehículo no las contara (Reportes sí).
-- Ahora suma TODAS las cargas; min/max solo consideran las que tienen km.
CREATE OR REPLACE VIEW fuel_summary
WITH (security_invoker = true) AS
SELECT
  vehicle_id,
  count(*)        AS loads,
  sum(liters)     AS total_liters,
  sum(total_cost) AS total_cost,
  min(km_at_load) AS min_km,
  max(km_at_load) AS max_km
FROM fuel_loads
GROUP BY vehicle_id;

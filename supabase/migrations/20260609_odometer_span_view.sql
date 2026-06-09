-- Vista de resumen de odómetro por vehículo (evita el límite de 1000 filas
-- al calcular cumplimiento de km y costo por km/hora en dashboard y reportes)
CREATE OR REPLACE VIEW odometer_span
WITH (security_invoker = true) AS
SELECT
  vehicle_id,
  min(km)            AS min_km,
  max(km)            AS max_km,
  max(reading_date)  AS last_date
FROM odometer_readings
GROUP BY vehicle_id;

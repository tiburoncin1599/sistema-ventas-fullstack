-- Actualizar extensiones de .jpg a .png en imagen_url
UPDATE productos
SET imagen_url = REPLACE(imagen_url, '.jpg', '.png')
WHERE imagen_url LIKE '%.jpg';

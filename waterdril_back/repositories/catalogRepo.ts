// =============================================================================
//  Service catalogue + nearby-provider geosearch (SRID-4326 spatial index).
// =============================================================================
import client from "../db/client.ts";

const catalogRepo = {
  listCategories(activeOnly = true) {
    return client.query(
      `SELECT id, \`key\`, name, description, active,
              price, price_unit, price_note, pricing_mode, icon, cta_label, accent, sort_order, tat_hours
         FROM service_categories
        ${activeOnly ? "WHERE active = 1" : ""}
        ORDER BY sort_order, name`,
    );
  },

  createCategory({ key, name, description, tat_hours }: { key: string; name: string; description?: string; tat_hours?: number }) {
    return client.query(
      `INSERT INTO service_categories (\`key\`, name, description, tat_hours, active) VALUES (?, ?, ?, ?, 1)`,
      [key, name, description ?? null, tat_hours ?? null],
    );
  },

  updateCategory(id: number, { name, active, tat_hours }: { name?: string; active?: boolean; tat_hours?: number }) {
    const sets: string[] = [];
    // deno-lint-ignore no-explicit-any
    const params: any[] = [];
    if (name !== undefined) {
      sets.push("name = ?");
      params.push(name);
    }
    if (active !== undefined) {
      sets.push("active = ?");
      params.push(active ? 1 : 0);
    }
    if (tat_hours !== undefined) {
      sets.push("tat_hours = ?");
      params.push(tat_hours);
    }
    if (!sets.length) return Promise.resolve(null);
    params.push(id);
    return client.query(`UPDATE service_categories SET ${sets.join(", ")} WHERE id = ?`, params);
  },

  /**
   * Available providers of a category, ordered by true distance from (lat,lng)
   * using ST_Distance_Sphere on the spatial index. Returns distance_km.
   */
  nearbyProviders(
    { categoryKey, lat, lng, radiusKm, excludeUserId }: {
      categoryKey: string;
      lat: number;
      lng: number;
      radiusKm: number;
      excludeUserId?: number;
    },
  ) {
    return client.query(
      `SELECT u.id, u.uuid, u.display_name, u.avatar_url, u.phone,
              pp.base_price, pp.rating_avg, pp.rating_count, pp.availability,
              pp.lat, pp.lng,
              ST_Distance_Sphere(pp.location, ST_SRID(POINT(?, ?), 4326)) / 1000 AS distance_km
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id AND u.deleted_at IS NULL AND u.status = 'active'
         JOIN service_categories sc ON sc.id = pp.category_id
        WHERE sc.\`key\` = ?
          AND pp.availability <> 'offline'
          AND (? IS NULL OR pp.user_id <> ?)
       HAVING distance_km <= ?
        ORDER BY distance_km ASC
        LIMIT 100`,
      [lng, lat, categoryKey, excludeUserId ?? null, excludeUserId ?? null, radiusKm],
    );
  },
};

export default catalogRepo;

/**
 * Memvalidasi bagian request memakai skema Zod.
 * Data hasil parse (sudah tersanitasi dan bertipe benar) menggantikan
 * data mentah, sehingga controller selalu menerima input yang valid.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'params'|'query'} [source]
 */
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    req[source] = result.data;
    return next();
  };

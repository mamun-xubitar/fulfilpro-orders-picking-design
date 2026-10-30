-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "CustomerContact" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" TEXT;

-- Data: the customer form no longer has an "Address 2" box on shipping addresses; keep its text.
UPDATE "CustomerAddress"
SET "address" = concat_ws(E'\n', NULLIF("address", ''), NULLIF("address2", '')),
    "address2" = NULL
WHERE NULLIF("address2", '') IS NOT NULL;

-- Data: the customer's own email / phone / billing address now live on its first contact
-- (the flat columns on "Customer" mirror it). Fill a contact with the same email, else add one.
UPDATE "CustomerContact" AS contact
SET "address" = COALESCE(contact."address", concat_ws(E'\n', NULLIF(customer."address", ''), NULLIF(customer."address2", ''))),
    "city" = COALESCE(contact."city", customer."city"),
    "state" = COALESCE(contact."state", customer."state"),
    "zip" = COALESCE(contact."zip", customer."zip"),
    "country" = COALESCE(contact."country", customer."country"),
    "phone" = COALESCE(contact."phone", customer."phone"),
    "position" = -1
FROM "Customer" AS customer
WHERE contact."customerId" = customer."id"
  AND NULLIF(customer."email", '') IS NOT NULL
  AND lower(contact."email") = lower(customer."email")
  AND contact."id" = (
    SELECT first."id" FROM "CustomerContact" AS first
    WHERE first."customerId" = customer."id" AND lower(first."email") = lower(customer."email")
    ORDER BY first."position" LIMIT 1
  );

INSERT INTO "CustomerContact" ("id", "customerId", "position", "name", "email", "phone", "address", "city", "state", "zip", "country")
SELECT gen_random_uuid()::text, customer."id", -1, customer."name", NULLIF(customer."email", ''), NULLIF(customer."phone", ''),
       NULLIF(concat_ws(E'\n', NULLIF(customer."address", ''), NULLIF(customer."address2", '')), ''),
       NULLIF(customer."city", ''), NULLIF(customer."state", ''), NULLIF(customer."zip", ''), NULLIF(customer."country", '')
FROM "Customer" AS customer
WHERE (
    NULLIF(customer."email", '') IS NOT NULL OR NULLIF(customer."phone", '') IS NOT NULL
    OR NULLIF(customer."address", '') IS NOT NULL OR NULLIF(customer."address2", '') IS NOT NULL
    OR NULLIF(customer."city", '') IS NOT NULL OR NULLIF(customer."state", '') IS NOT NULL
    OR NULLIF(customer."zip", '') IS NOT NULL
  )
  AND NOT EXISTS (SELECT 1 FROM "CustomerContact" AS contact WHERE contact."customerId" = customer."id" AND contact."position" = -1);

-- Data: close the gap left at the front.
UPDATE "CustomerContact" AS contact
SET "position" = ranked."rank" - 1
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "customerId" ORDER BY "position", "id") AS "rank"
  FROM "CustomerContact"
) AS ranked
WHERE contact."id" = ranked."id" AND contact."position" <> ranked."rank" - 1;

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "website" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "logo_url" TEXT,
    "original_logo_url" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "contact_first_name" TEXT,
    "contact_last_name" TEXT,
    "location" TEXT NOT NULL,
    "geocode_last_attempt" TIMESTAMPTZ(6),
    "geocode_attempts" INTEGER DEFAULT 0,
    "geocode_error" TEXT,
    "geocode_status" TEXT,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_locations" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "location_name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "country_id" TEXT,

    CONSTRAINT "club_locations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "club_locations" ADD CONSTRAINT "club_locations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

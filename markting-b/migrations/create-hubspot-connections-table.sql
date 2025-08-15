CREATE TABLE "hubspot_connections" (
    "id" SERIAL PRIMARY KEY,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "access_token" text NOT NULL,
    "refresh_token" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "token_type" varchar(20) DEFAULT 'Bearer',
    "portal_id" integer,
    "hub_domain" varchar(255),
    "account_name" varchar(255),
    "is_active" boolean DEFAULT true,
    "last_used_at" timestamp,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX "IDX_hubspot_connections_user_active" ON "hubspot_connections" ("user_id", "is_active");
CREATE INDEX "IDX_hubspot_connections_expires_at" ON "hubspot_connections" ("expires_at");

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hubspot_connections_updated_at
    BEFORE UPDATE ON "hubspot_connections"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

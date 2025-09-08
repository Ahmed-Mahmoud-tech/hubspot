-- Drop indexes (if exist)
DROP INDEX IF EXISTS idx_actions_user_id;
DROP INDEX IF EXISTS idx_contacts_email;
DROP INDEX IF EXISTS idx_contacts_phone;
DROP INDEX IF EXISTS idx_contacts_hubspot_id;
DROP INDEX IF EXISTS idx_contacts_user_id;
DROP INDEX IF EXISTS idx_matching_user_id;
DROP INDEX IF EXISTS idx_matching_api_key;
DROP INDEX IF EXISTS idx_merging_user_id_group_id;
DROP INDEX IF EXISTS idx_modified_user_id_api_key;
DROP INDEX IF EXISTS idx_remove_user_id_api_key;
DROP INDEX IF EXISTS idx_payments_user_id;
DROP INDEX IF EXISTS idx_user_plan_user_id;

-- Drop tables (if exist)
DROP TABLE IF EXISTS remove CASCADE;
DROP TABLE IF EXISTS modified CASCADE;
DROP TABLE IF EXISTS merging CASCADE;
DROP TABLE IF EXISTS matching CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS user_plan CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hubspot_connections CASCADE;


-- Drop types (if exist)
DROP TYPE IF EXISTS action_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
 
-- Create enum types
CREATE TYPE action_status AS ENUM (
	'start',
	'fetching',
	'filtering',
	'manually_merge',
	'update_hubspot',
	'finished',
	'error',
	'retrying',
	'removed'
);

CREATE TYPE payment_status AS ENUM (
	'pending',
	'completed',
	'failed'
);
 

-- Create users table
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	phone VARCHAR(20),
	password VARCHAR(255) NOT NULL,
	verified BOOLEAN DEFAULT FALSE,
	verification_token VARCHAR(255),
	reset_password_token VARCHAR(255),
	reset_password_expires TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment table
CREATE TABLE payments (
	id SERIAL PRIMARY KEY,
	api_key VARCHAR(255),
	user_id INTEGER NOT NULL REFERENCES users(id),
	amount INTEGER NOT NULL,
	contact_count INTEGER,
	billing_type VARCHAR(20),
	currency VARCHAR(3) DEFAULT 'usd',
	status payment_status DEFAULT 'pending',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	stripe_payment_intent_id VARCHAR(255) NOT NULL,
	original_price INTEGER
);

-- Create user_plans table
CREATE TABLE user_plan (
	id SERIAL PRIMARY KEY,
	"userId" INTEGER NOT NULL REFERENCES users(id),
	"planType" VARCHAR(50) NOT NULL,
	"activationDate" TIMESTAMP WITH TIME ZONE NOT NULL,
	"mergeGroupsUsed" INTEGER DEFAULT 0,
	"contactCount" INTEGER DEFAULT 0,
	"billingEndDate" TIMESTAMP WITH TIME ZONE,
	"paymentStatus" VARCHAR(50) DEFAULT 'active',
	"paymentId" INTEGER REFERENCES payments(id)
);

-- Create actions table
CREATE TABLE actions (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id),
	name VARCHAR(255) NOT NULL,
	api_key VARCHAR(500) NOT NULL,
	count INTEGER DEFAULT 0,
	status action_status DEFAULT 'start',
	process_name VARCHAR(255),
	message VARCHAR(1000),
	excel_link VARCHAR(500),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create contacts table
CREATE TABLE contacts (
	id SERIAL PRIMARY KEY,
	hubspot_id VARCHAR(255) NOT NULL,
	email VARCHAR(255),
	first_name VARCHAR(255),
	last_name VARCHAR(255),
	phone VARCHAR(255),
	company VARCHAR(255),
	create_date TIMESTAMP WITH TIME ZONE,
	last_modified_date TIMESTAMP WITH TIME ZONE,
	api_key VARCHAR(255) NOT NULL,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	hs_additional_emails TEXT,
	other_properties JSONB,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create matching table
CREATE TABLE matching (
	id SERIAL PRIMARY KEY,
	group_data JSONB NOT NULL,
	api_key VARCHAR(255) NOT NULL,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	merged BOOLEAN DEFAULT FALSE,
	merged_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    userId INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Create merging table
CREATE TABLE merging (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	api_key VARCHAR(255) NOT NULL,
	group_id INTEGER NOT NULL,
	primary_account_id VARCHAR(255) NOT NULL,
	secondary_account_id VARCHAR(255) NOT NULL,
	merge_status VARCHAR(255) DEFAULT 'completed',
	merged_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create modified table
CREATE TABLE modified (
	id SERIAL PRIMARY KEY,
	contact_id INTEGER NOT NULL,
	updated_data JSONB NOT NULL,
	api_key VARCHAR(255) NOT NULL,
	user_id INTEGER NOT NULL REFERENCES users(id),
	group_id INTEGER,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create remove table
CREATE TABLE remove (
	id SERIAL PRIMARY KEY,
	contact_id INTEGER NOT NULL,
	api_key VARCHAR(255) NOT NULL,
	user_id INTEGER NOT NULL REFERENCES users(id),
	group_id INTEGER,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create hubspot_connections table
CREATE TABLE hubspot_connections (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id),
	access_token TEXT NOT NULL,
	refresh_token TEXT NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	token_type VARCHAR(50) DEFAULT 'Bearer',
	portal_id VARCHAR(255),
	hub_domain VARCHAR(255),
	account_name VARCHAR(255),
	is_active BOOLEAN DEFAULT TRUE,
	last_used_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_actions_user_id ON actions(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_hubspot_id ON contacts(hubspot_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_matching_user_id ON matching(user_id);
CREATE INDEX idx_matching_api_key ON matching(api_key);
CREATE INDEX idx_merging_user_id_group_id ON merging(user_id, group_id);
CREATE INDEX idx_modified_user_id_api_key ON modified(user_id, api_key);
CREATE INDEX idx_remove_user_id_api_key ON remove(user_id, api_key);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_user_plans_user_id ON user_plans("userId");


--$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"; psql "postgresql://postgres:TQBidLbMvfmGqfGbmwjzBdngOsJHSQEN@shortline.proxy.rlwy.net:39822/railway" -f "d:\marketing\create-all-tables.sql"

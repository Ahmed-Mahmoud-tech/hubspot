-- UserPlan
CREATE TABLE user_plan (
	"id" SERIAL PRIMARY KEY,
	"userId" INTEGER NOT NULL,
	"planType" VARCHAR(50) NOT NULL,
	"activationDate" TIMESTAMP NOT NULL,
	"mergeGroupsUsed" INTEGER DEFAULT 0,
	"contactCount" INTEGER DEFAULT 0,
	"billingEndDate" TIMESTAMP,
	"paymentStatus" VARCHAR(50) DEFAULT 'active',
	"paymentId" INTEGER
);

-- User
CREATE TABLE users (
	"id" SERIAL PRIMARY KEY,
	"first_name" VARCHAR(100) NOT NULL,
	"last_name" VARCHAR(100) NOT NULL,
	"email" VARCHAR(255) UNIQUE NOT NULL,
	"phone" VARCHAR(20),
	"password" VARCHAR(255) NOT NULL,
	"verified" BOOLEAN DEFAULT FALSE,
	"verification_token" VARCHAR(255),
	"reset_password_token" VARCHAR(255),
	"reset_password_expires" TIMESTAMP
);

-- Plan
CREATE TABLE plan (
	"id" SERIAL PRIMARY KEY,
	"type" VARCHAR(50) NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"mergeGroupLimit" INTEGER,
	"contactLimit" INTEGER,
	"durationDays" INTEGER,
	"price" NUMERIC NOT NULL,
	"billingType" VARCHAR(20)
);

-- Payment
CREATE TABLE payment (
	"id" SERIAL PRIMARY KEY,
	"apiKey" VARCHAR(255),
	"userId" INTEGER NOT NULL,
	"amount" INTEGER NOT NULL,
	"contactCount" INTEGER,
	"billingType" VARCHAR(20),
	"currency" VARCHAR(10) DEFAULT 'usd',
	"status" VARCHAR(20) DEFAULT 'pending',
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact
CREATE TABLE contacts (
	"id" SERIAL PRIMARY KEY,
	"hubspotId" VARCHAR(255) UNIQUE NOT NULL,
	"email" VARCHAR(255),
	"firstName" VARCHAR(255),
	"lastName" VARCHAR(255),
	"phone" VARCHAR(255),
	"hs_additional_emails" TEXT,
	"other_properties" JSON,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modified
CREATE TABLE modified (
	"id" SERIAL PRIMARY KEY,
	"contactId" INTEGER NOT NULL,
	"updatedData" JSONB NOT NULL,
	"apiKey" VARCHAR(255) NOT NULL,
	"userId" INTEGER NOT NULL,
	"groupId" INTEGER,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Remove
CREATE TABLE remove (
	"id" SERIAL PRIMARY KEY,
	"contactId" INTEGER NOT NULL,
	"apiKey" VARCHAR(255) NOT NULL,
	"userId" INTEGER NOT NULL,
	"groupId" INTEGER,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matching
CREATE TABLE matching (
	"id" SERIAL PRIMARY KEY,
	"group" JSONB NOT NULL,
	"apiKey" VARCHAR(255) NOT NULL,
	"userId" INTEGER NOT NULL,
	"merged" BOOLEAN DEFAULT FALSE,
	"mergedAt" TIMESTAMP,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merging
CREATE TABLE merging (
	"id" SERIAL PRIMARY KEY,
	"userId" INTEGER NOT NULL,
	"apiKey" VARCHAR(255) NOT NULL,
	"groupId" INTEGER NOT NULL,
	"primaryAccountId" VARCHAR(255) NOT NULL,
	"secondaryAccountId" VARCHAR(255) NOT NULL,
	"mergeStatus" VARCHAR(50) DEFAULT 'completed',
	"mergedAt" TIMESTAMP,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actions
CREATE TABLE actions (
	"id" SERIAL PRIMARY KEY,
	"user_id" INTEGER NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"api_key" VARCHAR(500) NOT NULL,
	"count" INTEGER DEFAULT 0,
	"status" VARCHAR(50) DEFAULT 'start',
	"process_name" VARCHAR(255),
	"message" VARCHAR(1000),
	"excel_link" VARCHAR(500),
	"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

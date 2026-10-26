CREATE TYPE "public"."punch_source" AS ENUM('facial', 'manual');--> statement-breakpoint
CREATE TYPE "public"."punch_type" AS ENUM('entry', 'lunch_out', 'lunch_in', 'exit');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"cnpj" varchar(18),
	"contact" varchar(150),
	"whatsapp" varchar(20),
	"email" varchar(150),
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"tolerance_minutes" integer DEFAULT 10 NOT NULL,
	"night_start" varchar(5) DEFAULT '22:00' NOT NULL,
	"night_end" varchar(5) DEFAULT '05:00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_marks" (
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"abono" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "day_marks_employee_id_work_date_pk" PRIMARY KEY("employee_id","work_date")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"registration" varchar(30) NOT NULL,
	"name" varchar(150) NOT NULL,
	"admission_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"face_descriptor" jsonb,
	"face_photo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_company_registration_uq" UNIQUE("company_id","registration")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"name" varchar(150) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "holidays_company_date_uq" UNIQUE("company_id","holiday_date")
);
--> statement-breakpoint
CREATE TABLE "punches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "punch_type" NOT NULL,
	"punched_at" timestamp with time zone NOT NULL,
	"source" "punch_source" NOT NULL,
	"face_distance" real,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workday_rules" (
	"company_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"expected_minutes" integer NOT NULL,
	"first_overtime_minutes" integer NOT NULL,
	CONSTRAINT "workday_rules_company_id_weekday_pk" PRIMARY KEY("company_id","weekday")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_marks" ADD CONSTRAINT "day_marks_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punches" ADD CONSTRAINT "punches_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punches" ADD CONSTRAINT "punches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workday_rules" ADD CONSTRAINT "workday_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "employees_company_idx" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "employees_name_idx" ON "employees" USING btree ("name");--> statement-breakpoint
CREATE INDEX "holidays_company_idx" ON "holidays" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "punches_employee_punched_at_idx" ON "punches" USING btree ("employee_id","punched_at");
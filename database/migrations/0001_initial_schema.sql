-- Pentecostal Matrimony Database Initial Migration
-- PostgreSQL schema for Faith-Focused Matrimonial Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin', 'moderator'
    email TEXT UNIQUE,
    phone TEXT,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Profiles (Core)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL, -- 'woman', 'man', 'other'
    height_cm INTEGER NOT NULL,
    weight_kg INTEGER,
    mother_tongue TEXT NOT NULL DEFAULT '',
    marital_status TEXT NOT NULL DEFAULT 'Never Married',
    location TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT 'India',
    introduction TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'under_review', 'verified', 'rejected'
    verification_note TEXT,
    verification_submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS profiles_discovery_idx ON profiles (published, verification_status, location);

-- 3. Profile Photos
CREATE TABLE IF NOT EXISTS profile_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    object_path TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    visibility TEXT NOT NULL DEFAULT 'all_members', -- 'all_members', 'connections_only', 'private'
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS profile_photos_profile_idx ON profile_photos(profile_id);

-- 4. Faith Details
CREATE TABLE IF NOT EXISTS faith_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    religion TEXT NOT NULL DEFAULT 'Christian',
    denomination TEXT NOT NULL DEFAULT '',
    church TEXT NOT NULL DEFAULT '',
    baptism_status TEXT NOT NULL DEFAULT '',
    baptism_year INTEGER,
    church_involvement TEXT NOT NULL DEFAULT '',
    ministry_involvement TEXT NOT NULL DEFAULT '',
    spiritual_expectations TEXT NOT NULL DEFAULT '',
    faith_description TEXT NOT NULL DEFAULT ''
);

-- 5. Education Details
CREATE TABLE IF NOT EXISTS education_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    qualification TEXT NOT NULL DEFAULT '',
    degree TEXT NOT NULL DEFAULT '',
    institution TEXT NOT NULL DEFAULT '',
    field_of_study TEXT NOT NULL DEFAULT ''
);

-- 6. Employment Details
CREATE TABLE IF NOT EXISTS employment_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    occupation TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    work_location TEXT NOT NULL DEFAULT '',
    employment_status TEXT NOT NULL DEFAULT '',
    working_abroad BOOLEAN NOT NULL DEFAULT FALSE,
    country TEXT NOT NULL DEFAULT 'India'
);

-- 7. Family Details
CREATE TABLE IF NOT EXISTS family_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    family_status TEXT NOT NULL DEFAULT '',
    father_occupation TEXT NOT NULL DEFAULT '',
    mother_occupation TEXT NOT NULL DEFAULT '',
    siblings TEXT NOT NULL DEFAULT '',
    background TEXT NOT NULL DEFAULT '',
    values TEXT NOT NULL DEFAULT ''
);

-- 8. Partner Preferences
CREATE TABLE IF NOT EXISTS partner_preferences (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    age_min INTEGER NOT NULL DEFAULT 18,
    age_max INTEGER NOT NULL DEFAULT 60,
    locations TEXT[] NOT NULL DEFAULT '{}',
    denomination TEXT NOT NULL DEFAULT '',
    education TEXT NOT NULL DEFAULT '',
    occupation TEXT NOT NULL DEFAULT '',
    work_location TEXT NOT NULL DEFAULT '',
    family_values TEXT NOT NULL DEFAULT '',
    spiritual_expectations TEXT NOT NULL DEFAULT '',
    other TEXT NOT NULL DEFAULT ''
);

-- 9. Denominations Directory
CREATE TABLE IF NOT EXISTS denominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Churches Directory
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    denomination_id UUID REFERENCES denominations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    senior_pastor TEXT,
    contact_phone TEXT,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS churches_name_loc_idx ON churches (name, location);

-- 11. Interests & Matches
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT interests_from_to_unique UNIQUE (from_profile_id, to_profile_id)
);
CREATE INDEX IF NOT EXISTS interests_to_status_idx ON interests (to_profile_id, status);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    profile_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT matches_unique_pair UNIQUE (profile_a_id, profile_b_id)
);

-- 12. Saved Profiles
CREATE TABLE IF NOT EXISTS saved_profiles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, profile_id)
);

-- 13. Conversations & Messages
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    profile_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'ended', 'blocked'
    last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT conversations_participants_unique UNIQUE (profile_a_id, profile_b_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    delivered BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);

-- 14. Verification Requests
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    identity_document_type TEXT,
    identity_document_url TEXT,
    church_letter_url TEXT,
    pastor_contact TEXT,
    status TEXT NOT NULL DEFAULT 'under_review',
    reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 15. Reports & Blocked Users
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL, -- 'fake_profile', 'spam', 'harassment', 'inappropriate_content', 'misrepresentation', 'other'
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'reviewed', 'action_taken', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_user_id)
);

-- 16. Subscriptions Architecture
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'premium'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    current_period_end TIMESTAMP WITH TIME ZONE,
    interests_quota INTEGER NOT NULL DEFAULT 10,
    can_view_contact BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_advanced_filters BOOLEAN NOT NULL DEFAULT FALSE,
    has_profile_boost BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 17. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'new_interest', 'interest_accepted', 'new_message', 'profile_verified', 'profile_viewed', 'new_match'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 18. Privacy Settings
CREATE TABLE IF NOT EXISTS privacy_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visible BOOLEAN NOT NULL DEFAULT TRUE,
    photo_visibility TEXT NOT NULL DEFAULT 'all_members', -- 'all_members', 'connections_only', 'private'
    contact_visibility TEXT NOT NULL DEFAULT 'private', -- 'connections_only', 'private'
    show_online_status BOOLEAN NOT NULL DEFAULT FALSE,
    interest_permissions TEXT NOT NULL DEFAULT 'all_members', -- 'all_members', 'preferred_matches'
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 19. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

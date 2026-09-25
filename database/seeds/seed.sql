-- Seed data for Pentecostal Matrimony
-- Fictional profiles, churches, denominations and initial configurations

-- Insert Denominations
INSERT INTO denominations (id, name, description) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'Assemblies of God', 'Pentecostal Christian denomination affiliated with the World Assemblies of God Fellowship'),
    ('d2222222-2222-2222-2222-222222222222', 'Indian Pentecostal Church of God (IPC)', 'Indigenous Pentecostal church movement established in Kerala, India'),
    ('d3333333-3333-3333-3333-333333333333', 'Church of God (Full Gospel)', 'Holiness Pentecostal Christian denomination'),
    ('d4444444-4444-4444-4444-444444444444', 'Sharon Fellowship Church', 'Global Pentecostal denomination rooted in prayer and revival'),
    ('d5555555-5555-5555-5555-555555555555', 'Pentecostal Mar Thoma / Independent Pentecostal', 'Non-affiliated local Pentecostal fellowships and independent assemblies')
ON CONFLICT (name) DO NOTHING;

-- Insert Churches
INSERT INTO churches (id, denomination_id, name, location, senior_pastor, verified) VALUES
    ('c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Bethel AG Church', 'Hebbal, Bangalore, Karnataka', 'Rev. Johnson V.', true),
    ('c2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'IPC Ebenezer Church', 'Kumbanad, Pathanamthitta, Kerala', 'Pr. K. E. Abraham Memorial', true),
    ('c3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'Sharon Fellowship Worship Center', 'Manakkad, Thodupuzha, Kerala', 'Pr. John Thomas', true),
    ('c4444444-4444-4444-4444-444444444444', 'd1111111-1111-1111-1111-111111111111', 'Calvary AG Central Church', 'Kaloor, Kochi, Kerala', 'Rev. Sam Mathew', true),
    ('c5555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', 'International Pentecostal Fellowship', 'Dubai, UAE', 'Pastor David Roy', true)
ON CONFLICT DO NOTHING;

-- Demo Users
INSERT INTO users (id, role, email, phone) VALUES
    ('user_admin_demo', 'admin', 'steward@pentecostalmatrimony.org', '+91 98470 12345'),
    ('user_demo_anna', 'user', 'anna.mathew@example.com', '+91 98470 23456'),
    ('user_demo_joshua', 'user', 'joshua.varghese@example.com', '+91 98470 34567'),
    ('user_demo_sneha', 'user', 'sneha.philip@example.com', '+91 98470 45678')
ON CONFLICT (id) DO NOTHING;

-- Demo Profiles
INSERT INTO profiles (id, user_id, display_name, date_of_birth, gender, height_cm, weight_kg, mother_tongue, marital_status, location, country, introduction, published, verification_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'user_demo_anna', 'Anna Mathew', '1998-05-14', 'woman', 165, 54, 'Malayalam', 'Never Married', 'Bangalore', 'India', 'Born again and baptized believer. Working as a Staff Nurse in Bangalore. Seeking an spiritually rooted partner who values Christ and family.', true, 'verified'),
    ('22222222-2222-2222-2222-222222222222', 'user_demo_joshua', 'Dr. Joshua Varghese', '1995-11-20', 'man', 178, 72, 'Malayalam', 'Never Married', 'Kottayam', 'India', 'Consultant Physician and active church worship leader. Passionate about medical missions and godly living.', true, 'verified')
ON CONFLICT (id) DO NOTHING;

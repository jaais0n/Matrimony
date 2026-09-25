const fs = require('fs');
const path = require('path');
const { Client } = require('./node_modules/pg');

const connectionString = 'postgresql://neondb_owner:npg_DTj86nVbSHRq@ep-old-queen-b3qfwz1n-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const client = new Client({ connectionString });

async function run() {
  console.log('Connecting to Neon PostgreSQL...');
  await client.connect();
  console.log('Connected to Neon successfully!');

  // 1. Run migration schema
  const schemaPath = path.resolve(__dirname, '../../database/migrations/0001_initial_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying 0001_initial_schema.sql to Neon DB...');
  await client.query(schemaSql);
  console.log('Schema applied successfully.');

  // 2. Denominations
  console.log('Seeding denominations...');
  const denominations = [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      name: 'Assemblies of God',
      description: 'Pentecostal Christian denomination affiliated with the World Assemblies of God Fellowship',
    },
    {
      id: 'd2222222-2222-2222-2222-222222222222',
      name: 'Indian Pentecostal Church of God (IPC)',
      description: 'Indigenous Pentecostal church movement established in Kerala, India',
    },
    {
      id: 'd3333333-3333-3333-3333-333333333333',
      name: 'Church of God (Full Gospel)',
      description: 'Holiness Pentecostal Christian denomination with global mission presence',
    },
    {
      id: 'd4444444-4444-4444-4444-444444444444',
      name: 'Sharon Fellowship Church',
      description: 'Global Pentecostal denomination rooted in prayer, fasting, and biblical revival',
    },
    {
      id: 'd5555555-5555-5555-5555-555555555555',
      name: 'Independent Pentecostal Assemblies',
      description: 'Autonomous local spirit-filled Pentecostal fellowships and Bible assemblies',
    },
  ];

  for (const d of denominations) {
    await client.query(
      `INSERT INTO denominations (id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
      [d.id, d.name, d.description]
    );
  }

  // 3. Churches
  console.log('Seeding churches...');
  const churches = [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      denominationId: 'd1111111-1111-1111-1111-111111111111',
      name: 'Bethel AG Church',
      location: 'Hebbal, Bangalore, Karnataka',
      seniorPastor: 'Rev. Johnson V.',
      contactPhone: '+91 80 2345 6789',
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      denominationId: 'd2222222-2222-2222-2222-222222222222',
      name: 'IPC Ebenezer Church',
      location: 'Kumbanad, Pathanamthitta, Kerala',
      seniorPastor: 'Pr. K. E. Abraham Memorial',
      contactPhone: '+91 469 266 1234',
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      denominationId: 'd3333333-3333-3333-3333-333333333333',
      name: 'Sharon Fellowship Worship Center',
      location: 'Manakkad, Thodupuzha, Kerala',
      seniorPastor: 'Pr. John Thomas',
      contactPhone: '+91 4862 222 345',
    },
    {
      id: 'c4444444-4444-4444-4444-444444444444',
      denominationId: 'd1111111-1111-1111-1111-111111111111',
      name: 'Calvary AG Central Church',
      location: 'Kaloor, Kochi, Kerala',
      seniorPastor: 'Rev. Sam Mathew',
      contactPhone: '+91 484 234 5678',
    },
    {
      id: 'c5555555-5555-5555-5555-555555555555',
      denominationId: 'd1111111-1111-1111-1111-111111111111',
      name: 'International Pentecostal Fellowship',
      location: 'Dubai, UAE',
      seniorPastor: 'Pastor David Roy',
      contactPhone: '+971 4 398 7654',
    },
  ];

  for (const c of churches) {
    await client.query(
      `INSERT INTO churches (id, denomination_id, name, location, senior_pastor, contact_phone, verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         location = EXCLUDED.location,
         senior_pastor = EXCLUDED.senior_pastor,
         contact_phone = EXCLUDED.contact_phone`,
      [c.id, c.denominationId, c.name, c.location, c.seniorPastor, c.contactPhone]
    );
  }

  // 4. Users
  console.log('Seeding users...');
  const users = [
    { id: 'user_admin', role: 'admin', email: 'steward@pentecostalmatrimony.org', phone: '+91 98470 12345' },
    { id: 'user_grace', role: 'user', email: 'grace.philip@example.com', phone: '+91 98470 23456' },
    { id: 'user_joshua', role: 'user', email: 'joshua.varghese@example.com', phone: '+91 98470 34567' },
    { id: 'user_rebecca', role: 'user', email: 'rebecca.george@example.com', phone: '+91 98470 45678' },
    { id: 'user_samuel', role: 'user', email: 'samuel.george@example.com', phone: '+91 98470 56789' },
    { id: 'user_sneha', role: 'user', email: 'sneha.philip@example.com', phone: '+91 98470 67890' },
    { id: 'user_daniel', role: 'user', email: 'daniel.varghese@example.com', phone: '+91 98470 78901' },
    { id: 'user_me', role: 'user', email: 'me@pentecostalmatrimony.org', phone: '+91 98470 99999' },
  ];

  for (const u of users) {
    await client.query(
      `INSERT INTO users (id, role, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone, role = EXCLUDED.role`,
      [u.id, u.role, u.email, u.phone]
    );
  }

  // 5. Profiles & Related Details
  console.log('Seeding profiles & faith/career/family data...');
  const profiles = [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      userId: 'user_grace',
      displayName: 'Grace Philip',
      dateOfBirth: '1999-04-12',
      gender: 'woman',
      heightCm: 164,
      weightKg: 55,
      motherTongue: 'Malayalam',
      maritalStatus: 'Never Married',
      location: 'Kochi, Kerala',
      country: 'India',
      introduction: 'Born and raised in a God-fearing Pentecostal family. I accepted Jesus Christ as my personal Saviour at age 14 and was baptized in 2014. Currently working as a Senior Software Engineer at an MNC. Seeking a spiritually grounded partner who loves the Lord wholeheartedly.',
      published: true,
      verificationStatus: 'verified',
      faith: {
        religion: 'Christianity',
        denomination: 'Assemblies of God',
        church: 'Bethel AG Church, Ernakulam',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: 2014,
        churchInvolvement: 'Worship team vocalist and Sunday School teacher',
        ministryInvolvement: 'Youth fellowship and campus evangelism outreach',
        spiritualExpectations: 'A partner with personal prayer life, family altar values, and commitment to local church ministry.',
        faithDescription: 'Daily quiet time and Scripture reading form the anchor of my life. Christ is my center.',
      },
      education: {
        qualification: 'B.Tech in Computer Science',
        degree: 'Bachelor of Technology',
        institution: 'Model Engineering College, Kochi',
        fieldOfStudy: 'Computer Science and Engineering',
      },
      career: {
        occupation: 'Senior Software Engineer',
        company: 'ThoughtWorks',
        workLocation: 'Kochi (Hybrid)',
        employmentStatus: 'Full-time',
        workingAbroad: false,
        country: 'India',
      },
      family: {
        familyStatus: 'Upper Middle Class',
        fatherOccupation: 'Retired Government Officer',
        motherOccupation: 'High School Teacher',
        siblings: '1 elder brother (Married, UK)',
        background: 'Respected Pentecostal family with deep ministerial roots in Central Travancore.',
        values: 'God-first, mutual honor, hospitality, and dedication to kingdom work.',
      },
      preferences: {
        ageMin: 27,
        ageMax: 32,
        locations: ['Kerala', 'Bangalore', 'UK', 'Canada', 'UAE'],
        denomination: 'Assemblies of God / IPC / Church of God',
        education: 'B.Tech / Masters / Professional degree',
        occupation: 'IT / Engineering / Healthcare / Professional',
        workLocation: 'India or Abroad',
        familyValues: 'Traditional Christian values with mutual respect and spiritual maturity.',
        spiritualExpectations: 'Spirit-filled believer who prioritizes prayer and godly family life.',
        other: 'Non-smoker, teetotaler, clean habits.',
      },
      photos: [
        {
          id: '11111111-1111-1111-1111-111111111101',
          objectPath: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
          isPrimary: true,
          visibility: 'all_members',
        },
      ],
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      userId: 'user_joshua',
      displayName: 'Dr. Joshua Varghese',
      dateOfBirth: '1996-11-20',
      gender: 'man',
      heightCm: 178,
      weightKg: 72,
      motherTongue: 'Malayalam',
      maritalStatus: 'Never Married',
      location: 'Kottayam, Kerala',
      country: 'India',
      introduction: 'Consultant Physician with a heart for medical missions. Baptized in 2012, serving in worship ministry and medical camps.',
      published: true,
      verificationStatus: 'verified',
      faith: {
        religion: 'Christianity',
        denomination: 'Indian Pentecostal Church of God (IPC)',
        church: 'IPC Ebenezer, Kumbanad',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: 2012,
        churchInvolvement: 'Worship leader and youth committee convener',
        ministryInvolvement: 'Free medical outreach camps in rural tribal missions',
        spiritualExpectations: 'A partner dedicated to Christ who desires a godly family that honors God in all seasons.',
        faithDescription: 'Grace saved me; medical missions are how I reflect Christ\'s healing hands.',
      },
      education: {
        qualification: 'M.D. General Medicine, MBBS',
        degree: 'Postgraduate Medical Doctor',
        institution: 'Christian Medical College (CMC), Vellore',
        fieldOfStudy: 'Internal Medicine',
      },
      career: {
        occupation: 'Consultant Physician',
        company: 'Caritas Hospital & Institute of Health',
        workLocation: 'Kottayam, Kerala',
        employmentStatus: 'Permanent Consultant',
        workingAbroad: false,
        country: 'India',
      },
      family: {
        familyStatus: 'Affluent / Established',
        fatherOccupation: 'Senior Pastor & Bible College Dean',
        motherOccupation: 'Homemaker and Women’s Fellowship Leader',
        siblings: '2 sisters (Both married, Doctors in USA and Trivandrum)',
        background: 'Prominent third-generation Pentecostal family known for pastoral stewardship and biblical integrity.',
        values: 'Biblical truth, hospitality, generosity, and strong commitment to pastoral fellowship.',
      },
      preferences: {
        ageMin: 24,
        ageMax: 28,
        locations: ['Kerala', 'Bangalore', 'Chennai', 'Abroad'],
        denomination: 'IPC / Assemblies of God / Sharon Fellowship',
        education: 'Doctorate / Medical / Engineering / Masters',
        occupation: 'Healthcare, Academic, Software or Corporate',
        workLocation: 'India or Abroad',
        familyValues: 'Christ-centered home where prayer and Scripture take preeminence.',
        spiritualExpectations: 'Spiritually baptized believer passionate about ministry.',
        other: 'Compassionate, teetotaler, God-reverent.',
      },
      photos: [
        {
          id: '22222222-2222-2222-2222-222222222202',
          objectPath: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
          isPrimary: true,
          visibility: 'all_members',
        },
      ],
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      userId: 'user_rebecca',
      displayName: 'Rebecca E. George',
      dateOfBirth: '1999-01-19',
      gender: 'woman',
      heightCm: 162,
      weightKg: 52,
      motherTongue: 'Malayalam',
      maritalStatus: 'Never Married',
      location: 'Thiruvananthapuram, Kerala',
      country: 'India',
      introduction: 'Born-again believer and Assistant Professor in English Literature. Actively serving in church choir and youth fellowship.',
      published: true,
      verificationStatus: 'verified',
      faith: {
        religion: 'Christianity',
        denomination: 'Assemblies of God',
        church: 'Bethel AG Church, Trivandrum',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: 2015,
        churchInvolvement: 'Choir accompanist and Sunday school teacher',
        ministryInvolvement: 'Youth Bible study leader and medical mission coordinator',
        spiritualExpectations: 'A spirit-filled partner who honors Christ, maintains personal prayer life, and leads with love.',
        faithDescription: 'Walking in the grace of Jesus Christ since childhood.',
      },
      education: {
        qualification: 'Master of Arts (M.A.), UGC-NET',
        degree: 'Post Graduate',
        institution: 'University of Kerala',
        fieldOfStudy: 'English Literature and Linguistics',
      },
      career: {
        occupation: 'Assistant Professor',
        company: 'Mar Ivanios College',
        workLocation: 'Trivandrum',
        employmentStatus: 'Full-time Permanent',
        workingAbroad: false,
        country: 'India',
      },
      family: {
        familyStatus: 'Upper Middle Class',
        fatherOccupation: 'College Principal (Retired)',
        motherOccupation: 'Professor of Zoology',
        siblings: '1 Elder Sister (Married, Doctor in USA)',
        background: 'Well-respected Pentecostal family with deep community and spiritual roots in Travancore.',
        values: 'Christ-centered home, prayer altar, humility, and family hospitality.',
      },
      preferences: {
        ageMin: 27,
        ageMax: 32,
        locations: ['Kerala', 'Bangalore', 'Chennai', 'Abroad'],
        denomination: 'Assemblies of God / IPC / Church of God',
        education: 'Post Graduate / Professional / Doctorate',
        occupation: 'Academic, Research, Corporate, Medical, Tech',
        workLocation: 'India or Abroad',
        familyValues: 'Traditional godly values and mutual honor',
        spiritualExpectations: 'Active church member who honors biblical principles',
        other: 'Non-smoker, compassionate demeanor',
      },
      photos: [
        {
          id: '33333333-3333-3333-3333-333333333303',
          objectPath: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
          isPrimary: true,
          visibility: 'all_members',
        },
      ],
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      userId: 'user_samuel',
      displayName: 'Samuel K. George',
      dateOfBirth: '1994-08-15',
      gender: 'man',
      heightCm: 181,
      weightKg: 78,
      motherTongue: 'Malayalam',
      maritalStatus: 'Never Married',
      location: 'Dallas, Texas',
      country: 'United States',
      introduction: 'Senior Financial Analyst at JPMorgan Chase in Dallas, Texas. Born-again, spirit-filled believer involved in local Indian Pentecostal fellowship. Seeking a spiritually minded believer who loves the Lord and cherishes family.',
      published: true,
      verificationStatus: 'verified',
      faith: {
        religion: 'Christianity',
        denomination: 'Church of God',
        church: 'Hebron Church of God, Dallas',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: 2011,
        churchInvolvement: 'Youth treasurer and media coordinator',
        ministryInvolvement: 'Campus outreach and Thanksgiving mission sponsor',
        spiritualExpectations: 'A praying partner who loves church worship and wants to raise children in the fear of the Lord.',
        faithDescription: 'Grateful for God\'s grace in every season of life.',
      },
      education: {
        qualification: 'M.S. in Finance & MBA',
        degree: 'Master of Science',
        institution: 'University of Texas at Dallas',
        fieldOfStudy: 'Corporate Finance and Investment Analysis',
      },
      career: {
        occupation: 'Senior Financial Analyst',
        company: 'JPMorgan Chase & Co.',
        workLocation: 'Dallas, TX',
        employmentStatus: 'Full-time (US Citizen)',
        workingAbroad: true,
        country: 'United States',
      },
      family: {
        familyStatus: 'Upper Middle Class',
        fatherOccupation: 'Structural Engineer (Retired)',
        motherOccupation: 'Registered Nurse (RN), Dallas Hospital',
        siblings: '1 younger brother (Civil Engineer, Houston)',
        background: 'Originated from Kumbanad, settled in the United States since 1998 with deep spiritual commitment.',
        values: 'Simplicity, prayer altar, hard work, and loyalty to Christian fellowship.',
      },
      preferences: {
        ageMin: 24,
        ageMax: 29,
        locations: ['USA', 'Canada', 'Kerala', 'Bangalore'],
        denomination: 'Church of God / Assemblies of God / IPC',
        education: 'Graduate / Post-Graduate / Professional',
        occupation: 'Finance, Tech, Healthcare, Education',
        workLocation: 'USA or willing to relocate to USA',
        familyValues: 'Respectful, family-oriented, prayer-focused home.',
        spiritualExpectations: 'Baptized believer with personal faith in Jesus Christ.',
        other: 'Teetotaler, humble and warm personality.',
      },
      photos: [
        {
          id: '44444444-4444-4444-4444-444444444404',
          objectPath: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
          isPrimary: true,
          visibility: 'all_members',
        },
      ],
    },
    {
      id: 'a5555555-5555-5555-5555-555555555555',
      userId: 'user_sneha',
      displayName: 'Sneha Philip',
      dateOfBirth: '2000-02-14',
      gender: 'woman',
      heightCm: 160,
      weightKg: 50,
      motherTongue: 'Malayalam',
      maritalStatus: 'Never Married',
      location: 'Bangalore, Karnataka',
      country: 'India',
      introduction: 'UI/UX Designer working in a top product company in Bangalore. Active in worship team and youth mentorship. Seeking an earnest believer with sincere faith and high integrity.',
      published: true,
      verificationStatus: 'verified',
      faith: {
        religion: 'Christianity',
        denomination: 'Sharon Fellowship',
        church: 'Sharon Fellowship Church, Bangalore Central',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: 2017,
        churchInvolvement: 'Keyboardist and creative media coordinator',
        ministryInvolvement: 'Digital gospel tracts and youth camp mentorship',
        spiritualExpectations: 'A partner with gentle spiritual maturity who leads with prayer and biblical values.',
        faithDescription: 'Saved by Jesus Christ; eager to use creativity for His kingdom.',
      },
      education: {
        qualification: 'B.Des (Visual Communication)',
        degree: 'Bachelor of Design',
        institution: 'National Institute of Design (NID)',
        fieldOfStudy: 'Interactive Media & User Experience',
      },
      career: {
        occupation: 'Senior Product Designer',
        company: 'Swiggy HQ',
        workLocation: 'Bangalore',
        employmentStatus: 'Full-time',
        workingAbroad: false,
        country: 'India',
      },
      family: {
        familyStatus: 'Middle Class',
        fatherOccupation: 'Contractor & Building Consultant',
        motherOccupation: 'Bank Manager (Retired)',
        siblings: '1 elder sister (Architect, married, Bangalore)',
        background: 'Rooted in God\'s word from Thiruvalla, Kerala; second generation in Bangalore.',
        values: 'Honesty, respect for elders, prayer fellowship, and love for God\'s house.',
      },
      preferences: {
        ageMin: 26,
        ageMax: 31,
        locations: ['Bangalore', 'Kerala', 'Hyderabad', 'Europe', 'USA'],
        denomination: 'Sharon Fellowship / Assemblies of God / IPC',
        education: 'Engineering / Design / Business / Professional',
        occupation: 'Product, Engineering, Tech, Healthcare',
        workLocation: 'Bangalore, India or Abroad',
        familyValues: 'Loving, god-centered family with positive outlook.',
        spiritualExpectations: 'Born-again believer who loves worship.',
        other: 'Non-smoker, friendly, teetotaler.',
      },
      photos: [
        {
          id: '55555555-5555-5555-5555-555555555505',
          objectPath: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          isPrimary: true,
          visibility: 'all_members',
        },
      ],
    },
    {
      id: 'a6666666-6666-6666-6666-666666666666',
      userId: 'user_daniel',
      displayName: 'Daniel K. Varghese',
      dateOfBirth: '1994-06-25',
      gender: 'man',
      heightCm: 176,
      weightKg: 74,
      motherTongue: 'Malayalam',
      maritalStatus: 'Never Married',
      location: 'Dubai, UAE',
      country: 'United Arab Emirates',
      introduction: 'Cloud Solutions Architect based in Dubai. Water baptized and active member of International Pentecostal Fellowship Dubai. Seeking a God-fearing, spirit-filled partner who honors Christ.',
      published: true,
      verificationStatus: 'verified',
      faith: {
        religion: 'Christianity',
        denomination: 'Assemblies of God',
        church: 'International Pentecostal Fellowship, Dubai',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: 2010,
        churchInvolvement: 'Sound engineer, audio technician, and youth mentor',
        ministryInvolvement: 'Gulf mission support and Bible translation outreach partner',
        spiritualExpectations: 'A born-again partner who cherishes the Word of God and desires to walk in the fear of the Lord.',
        faithDescription: 'Jesus is my refuge and strength, an ever-present help in trouble.',
      },
      education: {
        qualification: 'B.Tech & AWS Certified Solutions Architect Professional',
        degree: 'Bachelor of Technology',
        institution: 'National Institute of Technology (NIT) Calicut',
        fieldOfStudy: 'Computer Science and Engineering',
      },
      career: {
        occupation: 'Cloud Solutions Architect',
        company: 'Amazon Web Services (AWS) MENA',
        workLocation: 'Dubai Internet City',
        employmentStatus: 'Full-time (UAE Resident)',
        workingAbroad: true,
        country: 'United Arab Emirates',
      },
      family: {
        familyStatus: 'Upper Middle Class',
        fatherOccupation: 'Civil Engineer (Retired, Dubai Municipality)',
        motherOccupation: 'Teacher (Retired)',
        siblings: '1 elder sister (Married, Banker in Canada)',
        background: 'Devout Pentecostal family with ancestral home in Ranni, Pathanamthitta.',
        values: 'Integrity, pastoral honor, hospitality, and daily family devotion.',
      },
      preferences: {
        ageMin: 24,
        ageMax: 29,
        locations: ['Dubai', 'UAE', 'Kerala', 'Bangalore', 'Abroad'],
        denomination: 'Assemblies of God / IPC / Church of God',
        education: 'Engineering / Healthcare / Business / Professional',
        occupation: 'IT, Healthcare, Finance, Professional',
        workLocation: 'UAE or willing to relocate to Dubai / Abroad',
        familyValues: 'Traditional godly heritage with biblical discernment.',
        spiritualExpectations: 'Spirit-filled believer baptized in water and Holy Spirit.',
        other: 'Teetotaler, clean moral character.',
      },
      photos: [
        {
          id: '66666666-6666-6666-6666-666666666606',
          objectPath: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
          isPrimary: true,
          visibility: 'all_members',
        },
      ],
    },
  ];

  for (const p of profiles) {
    // Insert Profile
    await client.query(
      `INSERT INTO profiles (
        id, user_id, display_name, date_of_birth, gender, height_cm, weight_kg,
        mother_tongue, marital_status, location, country, introduction, published, verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        mother_tongue = EXCLUDED.mother_tongue,
        marital_status = EXCLUDED.marital_status,
        location = EXCLUDED.location,
        country = EXCLUDED.country,
        introduction = EXCLUDED.introduction,
        published = EXCLUDED.published,
        verification_status = EXCLUDED.verification_status`,
      [
        p.id, p.userId, p.displayName, p.dateOfBirth, p.gender, p.heightCm, p.weightKg,
        p.motherTongue, p.maritalStatus, p.location, p.country, p.introduction, p.published, p.verificationStatus,
      ]
    );

    // Insert Faith Details
    await client.query(
      `INSERT INTO faith_details (
        profile_id, religion, denomination, church, baptism_status, baptism_year,
        church_involvement, ministry_involvement, spiritual_expectations, faith_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (profile_id) DO UPDATE SET
        denomination = EXCLUDED.denomination,
        church = EXCLUDED.church,
        baptism_status = EXCLUDED.baptism_status,
        baptism_year = EXCLUDED.baptism_year,
        church_involvement = EXCLUDED.church_involvement,
        ministry_involvement = EXCLUDED.ministry_involvement,
        spiritual_expectations = EXCLUDED.spiritual_expectations,
        faith_description = EXCLUDED.faith_description`,
      [
        p.id, p.faith.religion, p.faith.denomination, p.faith.church, p.faith.baptismStatus,
        p.faith.baptismYear, p.faith.churchInvolvement, p.faith.ministryInvolvement,
        p.faith.spiritualExpectations, p.faith.faithDescription,
      ]
    );

    // Insert Education Details
    await client.query(
      `INSERT INTO education_details (profile_id, qualification, degree, institution, field_of_study)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (profile_id) DO UPDATE SET
        qualification = EXCLUDED.qualification,
        degree = EXCLUDED.degree,
        institution = EXCLUDED.institution,
        field_of_study = EXCLUDED.field_of_study`,
      [p.id, p.education.qualification, p.education.degree, p.education.institution, p.education.fieldOfStudy]
    );

    // Insert Employment Details
    await client.query(
      `INSERT INTO employment_details (profile_id, occupation, company, work_location, employment_status, working_abroad, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (profile_id) DO UPDATE SET
        occupation = EXCLUDED.occupation,
        company = EXCLUDED.company,
        work_location = EXCLUDED.work_location,
        employment_status = EXCLUDED.employment_status,
        working_abroad = EXCLUDED.working_abroad,
        country = EXCLUDED.country`,
      [p.id, p.career.occupation, p.career.company, p.career.workLocation, p.career.employmentStatus, p.career.workingAbroad, p.career.country]
    );

    // Insert Family Details
    await client.query(
      `INSERT INTO family_details (profile_id, family_status, father_occupation, mother_occupation, siblings, background, values)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (profile_id) DO UPDATE SET
        family_status = EXCLUDED.family_status,
        father_occupation = EXCLUDED.father_occupation,
        mother_occupation = EXCLUDED.mother_occupation,
        siblings = EXCLUDED.siblings,
        background = EXCLUDED.background,
        values = EXCLUDED.values`,
      [p.id, p.family.familyStatus, p.family.fatherOccupation, p.family.motherOccupation, p.family.siblings, p.family.background, p.family.values]
    );

    // Insert Partner Preferences
    await client.query(
      `INSERT INTO partner_preferences (
        profile_id, age_min, age_max, locations, denomination, education,
        occupation, work_location, family_values, spiritual_expectations, other
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (profile_id) DO UPDATE SET
        age_min = EXCLUDED.age_min,
        age_max = EXCLUDED.age_max,
        locations = EXCLUDED.locations,
        denomination = EXCLUDED.denomination,
        education = EXCLUDED.education,
        occupation = EXCLUDED.occupation,
        work_location = EXCLUDED.work_location,
        family_values = EXCLUDED.family_values,
        spiritual_expectations = EXCLUDED.spiritual_expectations,
        other = EXCLUDED.other`,
      [
        p.id, p.preferences.ageMin, p.preferences.ageMax, p.preferences.locations,
        p.preferences.denomination, p.preferences.education, p.preferences.occupation,
        p.preferences.workLocation, p.preferences.familyValues, p.preferences.spiritualExpectations,
        p.preferences.other,
      ]
    );

    // Photos
    for (const ph of p.photos) {
      await client.query(
        `INSERT INTO profile_photos (id, profile_id, object_path, is_primary, visibility, sort_order)
         VALUES ($1, $2, $3, $4, $5, 1)
         ON CONFLICT (id) DO UPDATE SET object_path = EXCLUDED.object_path, is_primary = EXCLUDED.is_primary`,
        [ph.id, p.id, ph.objectPath, ph.isPrimary, ph.visibility]
      );
    }
  }

  // 6. Subscriptions
  console.log('Seeding subscriptions...');
  await client.query(
    `INSERT INTO subscriptions (id, user_id, plan, status, interests_quota, can_view_contact, can_use_advanced_filters, has_profile_boost)
     VALUES ('e1111111-1111-1111-1111-111111111111', 'user_grace', 'premium', 'active', 9999, true, true, true)
     ON CONFLICT (id) DO NOTHING`
  );

  // 7. Conversations & Messages
  console.log('Seeding active conversations & messages...');
  const convId = 'b1111111-1111-1111-1111-111111111111';
  await client.query(
    `INSERT INTO conversations (id, profile_a_id, profile_b_id, status)
     VALUES ($1, 'a1111111-1111-1111-1111-111111111111', 'a6666666-6666-6666-6666-666666666666', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [convId]
  );

  await client.query(
    `INSERT INTO messages (id, conversation_id, sender_profile_id, content, read, delivered)
     VALUES 
      ('c1111111-1111-1111-1111-111111111111', $1, 'a6666666-6666-6666-6666-666666666666', 'Praise the Lord Sister! I was encouraged by your profile and testimony of serving in Bethel AG.', true, true),
      ('c2222222-2222-2222-2222-222222222222', $1, 'a1111111-1111-1111-1111-111111111111', 'Praise the Lord Brother Daniel. Thank you for reaching out. Yes, God has been very faithful in our church fellowship.', true, true),
      ('c3333333-3333-3333-3333-333333333333', $1, 'a6666666-6666-6666-6666-666666666666', 'Praise the Lord! Thank you for connecting. It is wonderful to learn about your fellowship in Bangalore.', true, true)
     ON CONFLICT (id) DO NOTHING`,
    [convId]
  );

  // 8. Notifications
  console.log('Seeding notifications...');
  await client.query(
    `INSERT INTO notifications (id, profile_id, type, title, message, read, link)
     VALUES 
      ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'interest_accepted', 'Interest Accepted', 'Daniel K. Varghese accepted your interest. You are now connected.', true, '/messages'),
      ('d2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'profile_verified', 'Profile Verified', 'Your identity and pastoral verification have been approved by community stewards.', true, '/profile'),
      ('d3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'new_interest', 'New Expression of Interest', 'Dr. Joshua Varghese expressed interest in your profile.', false, '/interests')
     ON CONFLICT (id) DO NOTHING`
  );

  // 9. Interests
  console.log('Seeding interests...');
  await client.query(
    `INSERT INTO interests (id, from_profile_id, to_profile_id, status)
     VALUES 
      ('e1111111-2222-2222-2222-222222222222', 'a6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', 'accepted'),
      ('e2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'pending'),
      ('e3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'pending')
     ON CONFLICT (id) DO NOTHING`
  );

  // 10. Reports
  console.log('Seeding steward reports...');
  await client.query(
    `INSERT INTO reports (id, reporter_id, reported_profile_id, reason, details, status)
     VALUES 
      ('f1111111-1111-1111-1111-111111111111', 'user_grace', 'a4444444-4444-4444-4444-444444444444', 'misrepresentation', 'Kindly check the pastoral reference church address in Dallas.', 'open'),
      ('f2222222-2222-2222-2222-222222222222', 'user_sneha', 'a2222222-2222-2222-2222-222222222222', 'other', 'Requesting pastor verification re-confirmation.', 'open')
     ON CONFLICT (id) DO NOTHING`
  );

  console.log('✅ ALL DATA SUCCESSFULLY SEEDED INTO NEON DATABASE!');

  // Summary counts
  const profileCount = await client.query('SELECT COUNT(*) FROM profiles');
  const userCount = await client.query('SELECT COUNT(*) FROM users');
  const churchCount = await client.query('SELECT COUNT(*) FROM churches');
  const denomCount = await client.query('SELECT COUNT(*) FROM denominations');
  const msgCount = await client.query('SELECT COUNT(*) FROM messages');
  const intCount = await client.query('SELECT COUNT(*) FROM interests');

  console.log('Neon Database Summary:');
  console.log(`- Profiles: ${profileCount.rows[0].count}`);
  console.log(`- Users: ${userCount.rows[0].count}`);
  console.log(`- Denominations: ${denomCount.rows[0].count}`);
  console.log(`- Churches: ${churchCount.rows[0].count}`);
  console.log(`- Interests: ${intCount.rows[0].count}`);
  console.log(`- Messages: ${msgCount.rows[0].count}`);

  await client.end();
}

run().catch((err) => {
  console.error('Fatal error during Neon migration & seed:', err);
  client.end();
  process.exit(1);
});
